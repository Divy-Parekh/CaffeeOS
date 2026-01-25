const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify connection
transporter.verify((error, success) => {
    if (error) {
        console.log('⚠️ Email not configured:', error.message);
    } else {
        console.log('✅ Email server ready');
    }
});

module.exports = transporter;
