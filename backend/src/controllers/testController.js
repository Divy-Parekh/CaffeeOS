const { sendEmail } = require('../services/emailService');
const transporter = require('../config/nodemailer');

exports.testEmail = async (req, res) => {
    const to = req.query.to;
    if (!to) {
        return res.status(400).json({ error: 'Missing "to" query parameter' });
    }

    try {
        // First try verifying connection
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("SMTP Connection verified.");

        console.log("Sending email to:", to);
        const result = await sendEmail({
            to,
            subject: 'Test Email from CaffeeOS Debugger',
            html: '<h1>It Works!</h1><p>If you are reading this, the email service is configured correctly.</p>',
            text: 'It works! If you are reading this, the email service is configured correctly.'
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Email sent successfully',
                details: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Email service returned failure',
                error: result.error
            });
        }
    } catch (error) {
        console.error("Test email failed:", error);
        res.status(500).json({
            success: false,
            message: 'Exception during email sending',
            error: error.message,
            stack: error.stack
        });
    }
};
