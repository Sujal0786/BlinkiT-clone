import { Router } from 'express';
import auth from '../middleware/auth.js';
import { admin } from '../middleware/Admin.js';
import { registerPartner, getPartners, updatePartnerStatus } from '../controllers/deliveryPartner.controller.js';

const deliveryPartnerRouter = Router();

// Register a new delivery partner
deliveryPartnerRouter.post('/register', registerPartner);

// Get all delivery partners (admin only)
deliveryPartnerRouter.get('/', auth, admin, getPartners);

// Update delivery partner status (admin only)
deliveryPartnerRouter.put('/status', auth, admin, updatePartnerStatus);

export default deliveryPartnerRouter;
