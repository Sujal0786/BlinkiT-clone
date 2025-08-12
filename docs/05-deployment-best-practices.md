# Deployment & Best Practices - Blinkit-like MERN Application

## 🚀 Deployment Architecture

### Production Environment Setup

#### Container Orchestration with Kubernetes
```yaml
# kubernetes/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: blinkit-app
  labels:
    name: blinkit-app
---
# kubernetes/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: blinkit-app
data:
  NODE_ENV: "production"
  MONGODB_URI: "mongodb://mongodb-service:27017/blinkit"
  REDIS_URI: "redis://redis-service:6379"
  JWT_EXPIRY: "15m"
  REFRESH_TOKEN_EXPIRY: "7d"
```

#### Microservice Deployment
```yaml
# kubernetes/auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: blinkit-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: blinkit/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: blinkit-app
spec:
  selector:
    app: auth-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

#### Database Deployment
```yaml
# kubernetes/mongodb-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: blinkit-app
spec:
  serviceName: mongodb-service
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: username
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
        volumeMounts:
        - name: mongodb-storage
          mountPath: /data/db
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: mongodb-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

#### API Gateway with NGINX Ingress
```yaml
# kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blinkit-ingress
  namespace: blinkit-app
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.blinkit.com
    secretName: blinkit-tls
  rules:
  - host: api.blinkit.com
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3001
      - path: /api/products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 3002
      - path: /api/cart
        pathType: Prefix
        backend:
          service:
            name: cart-service
            port:
              number: 3003
      - path: /api/orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 3004
```

## 🔧 Docker Configuration

### Multi-stage Dockerfile for Node.js Services
```dockerfile
# Dockerfile for microservices
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

### Docker Compose for Development
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Databases
  mongodb:
    image: mongo:6.0
    container_name: blinkit-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - blinkit-network

  redis:
    image: redis:7-alpine
    container_name: blinkit-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - blinkit-network

  # Microservices
  auth-service:
    build:
      context: ./services/auth-service
      dockerfile: Dockerfile
    container_name: blinkit-auth-service
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3001
      - MONGODB_URI=mongodb://admin:password123@mongodb:27017/blinkit?authSource=admin
      - REDIS_URI=redis://redis:6379
      - JWT_SECRET=your-super-secret-jwt-key
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./services/auth-service:/app
      - /app/node_modules
    networks:
      - blinkit-network

  product-service:
    build:
      context: ./services/product-service
      dockerfile: Dockerfile
    container_name: blinkit-product-service
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3002
      - MONGODB_URI=mongodb://admin:password123@mongodb:27017/blinkit?authSource=admin
      - REDIS_URI=redis://redis:6379
    ports:
      - "3002:3002"
    depends_on:
      - mongodb
      - redis
    networks:
      - blinkit-network

  # API Gateway
  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Dockerfile
    container_name: blinkit-api-gateway
    restart: unless-stopped
    environment:
      - NODE_ENV=development
      - PORT=3000
      - AUTH_SERVICE_URL=http://auth-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
      - product-service
    networks:
      - blinkit-network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: blinkit-frontend
    restart: unless-stopped
    environment:
      - REACT_APP_API_URL=http://localhost:3000/api
    ports:
      - "3001:80"
    depends_on:
      - api-gateway
    networks:
      - blinkit-network

volumes:
  mongodb_data:
  redis_data:

networks:
  blinkit-network:
    driver: bridge
```

## 📊 Monitoring and Observability

### Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'blinkit-services'
    static_configs:
      - targets: 
        - 'auth-service:3001'
        - 'product-service:3002'
        - 'cart-service:3003'
        - 'order-service:3004'
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard Configuration
```json
{
  "dashboard": {
    "title": "Blinkit Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{service}} - {{method}} {{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m]) / rate(http_requests_total[5m])",
            "legendFormat": "Error Rate"
          }
        ]
      }
    ]
  }
}
```

## 🔒 Security Best Practices

### Security Headers Middleware
```typescript
// security/headers.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.razorpay.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // Rate limiting
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
  })
];
```

### Input Validation and Sanitization
```typescript
// validation/schemas.ts
import Joi from 'joi';

export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required().max(255),
  password: Joi.string().min(8).max(128).pattern(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
  ).required(),
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
});

export const addToCartSchema = Joi.object({
  productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  quantity: Joi.number().integer().min(1).max(10).required()
});
```

### Environment Configuration
```typescript
// config/environment.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  MONGODB_URI: z.string().url(),
  REDIS_URI: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  RAZORPAY_KEY_ID: z.string(),
  RAZORPAY_KEY_SECRET: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET: z.string()
});

export const env = envSchema.parse(process.env);
```

## 🚀 Scalability Strategies

### Horizontal Pod Autoscaling
```yaml
# kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: blinkit-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Database Sharding Strategy
```typescript
// database/sharding.ts
class DatabaseSharding {
  private getShardKey(userId: string): string {
    // Hash-based sharding
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const shardNumber = parseInt(hash.substring(0, 8), 16) % 4;
    return `shard_${shardNumber}`;
  }

  async getConnection(userId: string): Promise<Connection> {
    const shardKey = this.getShardKey(userId);
    return this.connectionPool.getConnection(shardKey);
  }

  async executeQuery(userId: string, query: any): Promise<any> {
    const connection = await this.getConnection(userId);
    return connection.execute(query);
  }
}
```

### Caching Strategy
```typescript
// cache/strategy.ts
class CacheStrategy {
  private redis: Redis;
  private localCache: NodeCache;

  async get<T>(key: string): Promise<T | null> {
    // L1 Cache (Local)
    let data = this.localCache.get<T>(key);
    if (data) {
      return data;
    }

    // L2 Cache (Redis)
    const redisData = await this.redis.get(key);
    if (redisData) {
      data = JSON.parse(redisData);
      this.localCache.set(key, data, 300); // 5 minutes local cache
      return data;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Set in both caches
    this.localCache.set(key, value, Math.min(ttl, 300));
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate local cache
    this.localCache.flushAll();
    
    // Invalidate Redis cache
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm run test:coverage
      env:
        MONGODB_URI: mongodb://localhost:27017/test
        REDIS_URI: redis://localhost:6379
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push Docker images
      run: |
        docker buildx build --platform linux/amd64,linux/arm64 \
          -t blinkit/auth-service:${{ github.sha }} \
          -t blinkit/auth-service:latest \
          --push ./services/auth-service

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup kubectl
      uses: azure/setup-kubectl@v3
      with:
        version: 'v1.24.0'
    
    - name: Deploy to Kubernetes
      run: |
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Update image tags
        sed -i 's|blinkit/auth-service:latest|blinkit/auth-service:${{ github.sha }}|g' kubernetes/auth-service-deployment.yaml
        
        # Apply configurations
        kubectl apply -f kubernetes/
        
        # Wait for rollout
        kubectl rollout status deployment/auth-service -n blinkit-app
```

## 📈 Performance Optimization

### Database Optimization
```typescript
// database/optimization.ts
class DatabaseOptimization {
  // Connection pooling
  private createConnectionPool(): MongoClient {
    return new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      readPreference: 'secondaryPreferred',
      writeConcern: { w: 'majority', j: true }
    });
  }

  // Index optimization
  async createOptimalIndexes(): Promise<void> {
    const db = this.client.db();
    
    // User collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { phone: 1 }, unique: true },
      { key: { createdAt: 1 } }
    ]);

    // Product collection indexes
    await db.collection('products').createIndexes([
      { key: { name: 'text', description: 'text', tags: 'text' } },
      { key: { category: 1, isActive: 1 } },
      { key: { 'price.sellingPrice': 1 } },
      { key: { 'ratings.average': -1 } },
      { key: { createdAt: -1 } }
    ]);

    // Order collection indexes
    await db.collection('orders').createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { orderNumber: 1 }, unique: true },
      { key: { status: 1 } },
      { key: { createdAt: -1 } }
    ]);
  }
}
```

This comprehensive deployment guide ensures your MERN application is production-ready with proper scalability, security, and monitoring capabilities.
