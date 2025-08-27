import DeliveryPartner from '../models/deliveryPartner.model.js';

// Register a new delivery partner
export const registerPartner = async (req, res, next) => {
    try {
        const { name, phone, vehicle } = req.body;
        
        // Check if partner already exists with the same phone
        const existingPartner = await DeliveryPartner.findOne({ phone });
        if (existingPartner) {
            return res.status(400).json({
                message: 'Delivery partner with this phone number already exists',
                error: true,
                success: false
            });
        }

        const partner = await DeliveryPartner.create({
            name,
            phone,
            vehicle,
            isAvailable: true
        });

        res.status(201).json({
            success: true,
            message: 'Delivery partner registered successfully',
            partner
        });
    } catch (error) {
        next(error);
    }
};

// Get all delivery partners
export const getPartners = async (req, res, next) => {
    try {
        const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: partners.length,
            partners
        });
    } catch (error) {
        next(error);
    }
};

// Assign a random available delivery partner
export const assignDeliveryPartner = async () => {
    try {
        // Find a random available partner
        const partner = await DeliveryPartner.aggregate([
            { $match: { isAvailable: true } },
            { $sample: { size: 1 } }
        ]);

        if (partner.length === 0) {
            throw new Error('No delivery partners available');
        }

        // Mark partner as unavailable
        await DeliveryPartner.findByIdAndUpdate(partner[0]._id, { isAvailable: false });

        return {
            _id: partner[0]._id,
            name: partner[0].name,
            phone: partner[0].phone,
            vehicle: partner[0].vehicle
        };
    } catch (error) {
        console.error('Error assigning delivery partner:', error);
        return null;
    }
};

// Mark partner as available (to be called when delivery is completed)
export const markAsAvailable = async (partnerId) => {
    try {
        await DeliveryPartner.findByIdAndUpdate(partnerId, { isAvailable: true });
        return true;
    } catch (error) {
        console.error('Error marking partner as available:', error);
        return false;
    }
};

// Update delivery partner status
/**
 * @route PUT /api/delivery-partner/status
 * @description Update delivery partner status (admin only)
 * @body {string} partnerId - The ID of the delivery partner
 * @body {boolean} isAvailable - The new availability status
 */
export const updatePartnerStatus = async (req, res, next) => {
    try {
        const { partnerId, isAvailable } = req.body;

        if (!partnerId || typeof isAvailable === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Partner ID and status are required',
                error: true
            });
        }

        const partner = await DeliveryPartner.findByIdAndUpdate(
            partnerId,
            { isAvailable },
            { new: true, runValidators: true }
        );

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Delivery partner not found',
                error: true
            });
        }

        res.status(200).json({
            success: true,
            message: `Partner marked as ${isAvailable ? 'available' : 'busy'}`,
            partner
        });
    } catch (error) {
        next(error);
    }
};
