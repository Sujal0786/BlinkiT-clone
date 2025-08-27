import mongoose from 'mongoose';

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true
    },
    vehicle: {
        type: String,
        trim: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    // Add timestamps for tracking
}, { timestamps: true });

// Index for faster querying of available partners
// deliveryPartnerSchema.index({ isAvailable: 1 });

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
export default DeliveryPartner;
