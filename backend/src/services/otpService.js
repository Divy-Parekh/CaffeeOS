const redis = require('../config/redis');

const OTP_PREFIX = 'otp:';
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 || 300; // 5 minutes in seconds

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP in Redis
const storeOTP = async (email, otp, purpose = 'signup') => {
    const key = `${OTP_PREFIX}${purpose}:${email}`;
    await redis.setex(key, OTP_EXPIRY, otp);
    return otp;
};

// Verify OTP from Redis
const verifyOTP = async (email, otp, purpose = 'signup') => {
    const key = `${OTP_PREFIX}${purpose}:${email}`;
    const storedOTP = await redis.get(key);

    if (!storedOTP) {
        return { valid: false, message: 'OTP expired or not found' };
    }

    if (storedOTP !== otp) {
        return { valid: false, message: 'Invalid OTP' };
    }

    // Delete OTP after successful verification
    await redis.del(key);
    return { valid: true, message: 'OTP verified successfully' };
};

// Delete OTP
const deleteOTP = async (email, purpose = 'signup') => {
    const key = `${OTP_PREFIX}${purpose}:${email}`;
    await redis.del(key);
};

module.exports = {
    generateOTP,
    storeOTP,
    verifyOTP,
    deleteOTP,
};
