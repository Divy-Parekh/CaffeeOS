const transporter = require('../config/nodemailer');

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@caffeeos.com',
            to,
            subject,
            html,
            text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
};

// Send OTP Email
const sendOTPEmail = async (email, otp, purpose = 'signup') => {
    const subjects = {
        signup: 'Verify your CaffeeOS account',
        reset: 'Reset your CaffeeOS password',
        login: 'Your CaffeeOS login code',
    };

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">☕ CaffeeOS</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Your verification code</h2>
        <p style="color: #6b7280; font-size: 16px;">
          Use the following code to ${purpose === 'reset' ? 'reset your password' : 'verify your account'}:
        </p>
        <div style="background: #4F46E5; color: white; font-size: 32px; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #9ca3af; font-size: 14px;">
          This code expires in 5 minutes. Do not share it with anyone.
        </p>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        © ${new Date().getFullYear()} CaffeeOS. All rights reserved.
      </div>
    </div>
  `;

    return sendEmail({
        to: email,
        subject: subjects[purpose] || 'Your CaffeeOS verification code',
        html,
        text: `Your CaffeeOS verification code is: ${otp}. This code expires in 5 minutes.`,
    });
};

// Send receipt email
const sendReceiptEmail = async (email, orderDetails) => {
    const { orderNumber, items, totalAmount, shopName } = orderDetails;

    const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">☕ ${shopName}</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937;">Order Receipt</h2>
        <p style="color: #6b7280;">Order #${orderNumber}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left;">Item</th>
              <th style="padding: 12px; text-align: center;">Qty</th>
              <th style="padding: 12px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 12px; font-weight: bold;">Total</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px;">₹${totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color: #10b981; text-align: center; font-size: 16px;">✓ Payment Received</p>
      </div>
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        Thank you for your visit! See you again soon.
      </div>
    </div>
  `;

    return sendEmail({
        to: email,
        subject: `Receipt for Order #${orderNumber} - ${shopName}`,
        html,
        text: `Thank you for your order #${orderNumber}. Total: ₹${totalAmount.toFixed(2)}`,
    });
};

module.exports = {
    sendEmail,
    sendOTPEmail,
    sendReceiptEmail,
};
