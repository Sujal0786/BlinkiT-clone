# Process Flow Flowchart - Blinkit MERN Application

## Complete User Journey: Cart to Payment

```mermaid
flowchart TD
    START([User Starts Shopping]) --> BROWSE[Browse Products]
    BROWSE --> SELECT[Select Product]
    SELECT --> ADD_CART{Add to Cart?}
    
    ADD_CART -->|Yes| VALIDATE_PRODUCT[Validate Product]
    ADD_CART -->|No| BROWSE
    
    VALIDATE_PRODUCT --> CHECK_INVENTORY[Check Inventory]
    CHECK_INVENTORY --> INVENTORY_OK{Stock Available?}
    
    INVENTORY_OK -->|No| OUT_OF_STOCK[Show Out of Stock]
    OUT_OF_STOCK --> BROWSE
    
    INVENTORY_OK -->|Yes| UPDATE_CART[Update Cart in Redis]
    UPDATE_CART --> CART_SUCCESS[Cart Updated Successfully]
    CART_SUCCESS --> CONTINUE{Continue Shopping?}
    
    CONTINUE -->|Yes| BROWSE
    CONTINUE -->|No| VIEW_CART[View Cart]
    
    VIEW_CART --> VALIDATE_CART[Validate Cart Items]
    VALIDATE_CART --> CART_VALID{Cart Valid?}
    
    CART_VALID -->|No| SHOW_ERRORS[Show Validation Errors]
    SHOW_ERRORS --> FIX_CART[Fix Cart Issues]
    FIX_CART --> VIEW_CART
    
    CART_VALID -->|Yes| CHECKOUT[Proceed to Checkout]
    CHECKOUT --> SELECT_ADDRESS[Select Delivery Address]
    SELECT_ADDRESS --> SELECT_PAYMENT[Select Payment Method]
    SELECT_PAYMENT --> CREATE_ORDER[Create Order]
    
    CREATE_ORDER --> RESERVE_STOCK[Reserve Stock]
    RESERVE_STOCK --> STOCK_RESERVED{Stock Reserved?}
    
    STOCK_RESERVED -->|No| STOCK_FAILED[Stock Reservation Failed]
    STOCK_FAILED --> VIEW_CART
    
    STOCK_RESERVED -->|Yes| GENERATE_PAYMENT[Generate Payment Intent]
    GENERATE_PAYMENT --> PAYMENT_PAGE[Show Payment Page]
    PAYMENT_PAGE --> PROCESS_PAYMENT[Process Payment]
    
    PROCESS_PAYMENT --> PAYMENT_SUCCESS{Payment Success?}
    
    PAYMENT_SUCCESS -->|No| PAYMENT_FAILED[Payment Failed]
    PAYMENT_FAILED --> RELEASE_STOCK[Release Reserved Stock]
    RELEASE_STOCK --> PAYMENT_PAGE
    
    PAYMENT_SUCCESS -->|Yes| CONFIRM_ORDER[Confirm Order]
    CONFIRM_ORDER --> UPDATE_INVENTORY[Update Inventory]
    UPDATE_INVENTORY --> CLEAR_CART[Clear User Cart]
    CLEAR_CART --> SEND_NOTIFICATIONS[Send Notifications]
    SEND_NOTIFICATIONS --> ASSIGN_DELIVERY[Assign Delivery Partner]
    ASSIGN_DELIVERY --> ORDER_CONFIRMED[Order Confirmed]
    ORDER_CONFIRMED --> TRACK_ORDER[Track Order]
    TRACK_ORDER --> END([Order Complete])

    %% Styling
    classDef startEnd fill:#4caf50,stroke:#2e7d32,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,color:#fff
    classDef error fill:#f44336,stroke:#c62828,color:#fff
    classDef success fill:#8bc34a,stroke:#558b2f,color:#fff

    class START,END startEnd
    class BROWSE,SELECT,VALIDATE_PRODUCT,CHECK_INVENTORY,UPDATE_CART,VIEW_CART,VALIDATE_CART,CHECKOUT,SELECT_ADDRESS,SELECT_PAYMENT,CREATE_ORDER,RESERVE_STOCK,GENERATE_PAYMENT,PAYMENT_PAGE,PROCESS_PAYMENT,CONFIRM_ORDER,UPDATE_INVENTORY,CLEAR_CART,SEND_NOTIFICATIONS,ASSIGN_DELIVERY,TRACK_ORDER process
    class ADD_CART,INVENTORY_OK,CONTINUE,CART_VALID,STOCK_RESERVED,PAYMENT_SUCCESS decision
    class OUT_OF_STOCK,SHOW_ERRORS,STOCK_FAILED,PAYMENT_FAILED,RELEASE_STOCK error
    class CART_SUCCESS,ORDER_CONFIRMED success
```

## Stock Reservation Process

```mermaid
flowchart TD
    START_RESERVE([Start Stock Reservation]) --> GET_LOCK[Acquire Distributed Lock]
    GET_LOCK --> LOCK_SUCCESS{Lock Acquired?}
    
    LOCK_SUCCESS -->|No| LOCK_FAILED[Lock Failed - Retry]
    LOCK_FAILED --> WAIT[Wait 100ms]
    WAIT --> GET_LOCK
    
    LOCK_SUCCESS -->|Yes| CHECK_CURRENT[Check Current Inventory]
    CHECK_CURRENT --> CALCULATE[Calculate Available Stock]
    CALCULATE --> SUFFICIENT{Sufficient Stock?}
    
    SUFFICIENT -->|No| RELEASE_LOCK[Release Lock]
    RELEASE_LOCK --> INSUFFICIENT[Return Insufficient Stock]
    INSUFFICIENT --> END_FAIL([Reservation Failed])
    
    SUFFICIENT -->|Yes| UPDATE_RESERVED[Update Reserved Quantity]
    UPDATE_RESERVED --> SET_EXPIRY[Set Reservation Expiry (10min)]
    SET_EXPIRY --> LOG_MOVEMENT[Log Inventory Movement]
    LOG_MOVEMENT --> RELEASE_LOCK2[Release Lock]
    RELEASE_LOCK2 --> SUCCESS[Return Success]
    SUCCESS --> END_SUCCESS([Reservation Successful])

    %% Auto-expiry process
    SET_EXPIRY -.-> TIMER[Timer: 10 minutes]
    TIMER -.-> AUTO_RELEASE[Auto-release if not confirmed]
    AUTO_RELEASE -.-> RESTORE_STOCK[Restore Reserved Stock]

    %% Styling
    classDef startEnd fill:#4caf50,stroke:#2e7d32,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,color:#fff
    classDef error fill:#f44336,stroke:#c62828,color:#fff
    classDef timer fill:#9c27b0,stroke:#6a1b9a,color:#fff

    class START_RESERVE,END_FAIL,END_SUCCESS startEnd
    class GET_LOCK,CHECK_CURRENT,CALCULATE,UPDATE_RESERVED,SET_EXPIRY,LOG_MOVEMENT,RELEASE_LOCK,RELEASE_LOCK2,WAIT process
    class LOCK_SUCCESS,SUFFICIENT decision
    class LOCK_FAILED,INSUFFICIENT error
    class TIMER,AUTO_RELEASE,RESTORE_STOCK timer
```

## Payment Processing Flow

```mermaid
flowchart TD
    START_PAY([User Initiates Payment]) --> CREATE_INTENT[Create Payment Intent]
    CREATE_INTENT --> RAZORPAY[Send to Razorpay Gateway]
    RAZORPAY --> PAYMENT_UI[Show Payment UI]
    PAYMENT_UI --> USER_PAY[User Enters Payment Details]
    
    USER_PAY --> GATEWAY_PROCESS[Gateway Processes Payment]
    GATEWAY_PROCESS --> GATEWAY_RESPONSE{Payment Response}
    
    GATEWAY_RESPONSE -->|Success| VERIFY_SIGNATURE[Verify Payment Signature]
    GATEWAY_RESPONSE -->|Failed| PAYMENT_FAILED[Payment Failed]
    GATEWAY_RESPONSE -->|Pending| PAYMENT_PENDING[Payment Pending]
    
    VERIFY_SIGNATURE --> SIGNATURE_VALID{Signature Valid?}
    
    SIGNATURE_VALID -->|No| FRAUD_DETECTED[Fraud Detected]
    FRAUD_DETECTED --> PAYMENT_FAILED
    
    SIGNATURE_VALID -->|Yes| UPDATE_ORDER[Update Order Status]
    UPDATE_ORDER --> CONFIRM_STOCK[Confirm Stock Reservation]
    CONFIRM_STOCK --> CLEAR_CART[Clear User Cart]
    CLEAR_CART --> SEND_CONFIRMATION[Send Confirmation Email/SMS]
    SEND_CONFIRMATION --> TRIGGER_FULFILLMENT[Trigger Order Fulfillment]
    TRIGGER_FULFILLMENT --> PAYMENT_SUCCESS[Payment Successful]
    
    PAYMENT_FAILED --> RELEASE_RESERVATION[Release Stock Reservation]
    RELEASE_RESERVATION --> NOTIFY_FAILURE[Notify Payment Failure]
    NOTIFY_FAILURE --> RETRY_OPTION[Offer Retry Option]
    
    PAYMENT_PENDING --> WEBHOOK_WAIT[Wait for Webhook]
    WEBHOOK_WAIT --> WEBHOOK_RECEIVED{Webhook Received?}
    WEBHOOK_RECEIVED -->|Success| VERIFY_SIGNATURE
    WEBHOOK_RECEIVED -->|Failed| PAYMENT_FAILED
    WEBHOOK_RECEIVED -->|Timeout| PAYMENT_TIMEOUT[Payment Timeout]
    PAYMENT_TIMEOUT --> PAYMENT_FAILED
    
    PAYMENT_SUCCESS --> END_SUCCESS([Payment Complete])
    RETRY_OPTION --> END_RETRY([Retry Available])

    %% Styling
    classDef startEnd fill:#4caf50,stroke:#2e7d32,color:#fff
    classDef process fill:#2196f3,stroke:#1565c0,color:#fff
    classDef decision fill:#ff9800,stroke:#ef6c00,color:#fff
    classDef error fill:#f44336,stroke:#c62828,color:#fff
    classDef success fill:#8bc34a,stroke:#558b2f,color:#fff
    classDef external fill:#9c27b0,stroke:#6a1b9a,color:#fff

    class START_PAY,END_SUCCESS,END_RETRY startEnd
    class CREATE_INTENT,VERIFY_SIGNATURE,UPDATE_ORDER,CONFIRM_STOCK,CLEAR_CART,SEND_CONFIRMATION,TRIGGER_FULFILLMENT,RELEASE_RESERVATION,NOTIFY_FAILURE process
    class GATEWAY_RESPONSE,SIGNATURE_VALID,WEBHOOK_RECEIVED decision
    class PAYMENT_FAILED,FRAUD_DETECTED,PAYMENT_TIMEOUT error
    class PAYMENT_SUCCESS success
    class RAZORPAY,PAYMENT_UI,USER_PAY,GATEWAY_PROCESS,PAYMENT_PENDING,WEBHOOK_WAIT external
```

## Order Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Order Placed
    Created --> PaymentPending: Awaiting Payment
    PaymentPending --> PaymentFailed: Payment Declined
    PaymentPending --> Confirmed: Payment Success
    
    PaymentFailed --> [*]: Order Cancelled
    
    Confirmed --> Preparing: Kitchen/Warehouse
    Preparing --> ReadyForPickup: Items Ready
    ReadyForPickup --> OutForDelivery: Assigned to Delivery Partner
    OutForDelivery --> Delivered: Successfully Delivered
    
    Confirmed --> Cancelled: User/Admin Cancellation
    Preparing --> Cancelled: User/Admin Cancellation
    ReadyForPickup --> Cancelled: User/Admin Cancellation
    
    Cancelled --> Refunded: Refund Processed
    Delivered --> [*]: Order Complete
    Refunded --> [*]: Order Complete
    
    note right of Created
        Stock Reserved
        Payment Intent Created
    end note
    
    note right of Confirmed
        Stock Confirmed
        Cart Cleared
        Notifications Sent
    end note
    
    note right of OutForDelivery
        Real-time Tracking
        ETA Updates
    end note
```
