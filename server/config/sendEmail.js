import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this if using another provider
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // App password (NOT your real password)
    }
});

// Send email function
const sendEmail = async ({ sendTo, subject, html }) => {
    try {
        const mailOptions = {
            from: `"Blinkit Clone" <${process.env.EMAIL_USER}>`,
            to: sendTo,
            subject: subject,
            html: html
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return info;
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

export default sendEmail;
