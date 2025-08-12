import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from './models/user.model.js';

dotenv.config();

const makeUserAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find user by email (replace with your email)
        const userEmail = 'sujal6067@gmail.com'; // UPDATE THIS WITH YOUR EMAIL
        
        // Update user role to ADMIN
        const updatedUser = await UserModel.findOneAndUpdate(
            { email: userEmail },
            { role: 'ADMIN' },
            { new: true }
        );

        if (updatedUser) {
            console.log(`✅ User ${updatedUser.email} is now an ADMIN!`);
            console.log(`Name: ${updatedUser.name}`);
            console.log(`Role: ${updatedUser.role}`);
        } else {
            console.log('❌ User not found. Please check the email address.');
            
            // Show all users to help find the correct email
            const allUsers = await UserModel.find({}, 'name email role');
            console.log('\n📋 All users in database:');
            allUsers.forEach(user => {
                console.log(`- ${user.name} (${user.email}) - Role: ${user.role}`);
            });
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
    }
};

makeUserAdmin();
