const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { generateOTP, storeOTP, verifyOTP } = require('../services/otpService');
const { sendOTPEmail } = require('../services/emailService');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse } = require('../utils/helpers');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// Signup - Send OTP
exports.signup = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
        throw new AppError('Email, password, and name are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser && existingUser.isVerified) {
        throw new AppError('Email already registered', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create or update user (unverified)
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            name,
        },
        create: {
            email,
            password: hashedPassword,
            name,
            role: 'ADMIN',
            isVerified: false,
        },
    });

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'signup');
    await sendOTPEmail(email, otp, 'signup');

    res.status(201).json(
        formatResponse({ userId: user.id }, 'OTP sent to your email. Please verify to complete signup.')
    );
});

// Verify OTP
exports.verifyOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new AppError('Email and OTP are required', 400);
    }

    // Verify OTP
    const result = await verifyOTP(email, otp, 'signup');
    if (!result.valid) {
        throw new AppError(result.message, 400);
    }

    // Activate user
    const user = await prisma.user.update({
        where: { email },
        data: { isVerified: true, isActive: true },
    });

    // Generate token
    const token = generateToken(user.id);

    res.json(
        formatResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        }, 'Account verified successfully')
    );
});

// Login
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    // Find user
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
        throw new AppError('Please verify your email first', 401);
    }

    if (!user.isActive) {
        throw new AppError('Account is deactivated', 401);
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError('Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user.id);

    res.json(
        formatResponse({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            token,
        }, 'Login successful')
    );
});

// Forgot Password - Send OTP
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new AppError('Email is required', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        // Don't reveal if user exists
        return res.json(formatResponse(null, 'If an account exists, OTP has been sent'));
    }

    // Generate and send OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'reset');
    await sendOTPEmail(email, otp, 'reset');

    res.json(formatResponse(null, 'OTP sent to your email'));
});

// Reset Password
exports.resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new AppError('Email, OTP, and new password are required', 400);
    }

    // Verify OTP
    const result = await verifyOTP(email, otp, 'reset');
    if (!result.valid) {
        throw new AppError(result.message, 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
    });

    res.json(formatResponse(null, 'Password reset successful'));
});

// Get current user
exports.getMe = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
    });

    res.json(formatResponse(user));
});

// Logout (client-side, but we can add token blacklisting later)
exports.logout = asyncHandler(async (req, res) => {
    // For now, just return success. Token invalidation would be handled client-side
    // or by implementing a token blacklist in Redis
    res.json(formatResponse(null, 'Logged out successfully'));
});
