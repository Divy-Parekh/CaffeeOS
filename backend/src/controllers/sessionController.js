const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse } = require('../utils/helpers');

// Get sessions by query params (frontend pattern)
exports.getSessionsByQuery = asyncHandler(async (req, res) => {
    const { shopId, status } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    const where = { shopId };
    if (status) {
        where.status = status;
    }

    const sessions = await prisma.session.findMany({
        where,
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            _count: {
                select: { orders: true },
            },
        },
        orderBy: { openedAt: 'desc' },
    });

    res.json(formatResponse(sessions));
});

// Get current open session for a shop
exports.getCurrentSession = asyncHandler(async (req, res) => {
    const { shopId } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    const session = await prisma.session.findFirst({
        where: {
            shopId,
            status: 'OPEN',
        },
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            shop: {
                select: { id: true, name: true },
            },
        },
    });

    res.json(formatResponse(session));
});

// Get sessions for a shop (path param pattern)
exports.getSessions = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { status } = req.query;

    const where = { shopId };
    if (status) {
        where.status = status;
    }

    const sessions = await prisma.session.findMany({
        where,
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            _count: {
                select: { orders: true },
            },
        },
        orderBy: { openedAt: 'desc' },
    });

    res.json(formatResponse(sessions));
});

// Get single session
exports.getSession = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
        where: { id },
        include: {
            user: {
                select: { id: true, name: true, email: true },
            },
            shop: {
                select: { id: true, name: true },
            },
            orders: {
                orderBy: { createdAt: 'desc' },
                include: {
                    items: true,
                    customer: {
                        select: { id: true, name: true },
                    },
                },
            },
        },
    });

    if (!session) {
        throw new AppError('Session not found', 404);
    }

    res.json(formatResponse(session));
});

// Start session (open POS)
exports.startSession = asyncHandler(async (req, res) => {
    const { shopId, openingCash = 0 } = req.body;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    // Check if there's already an open session for this shop
    const existingSession = await prisma.session.findFirst({
        where: {
            shopId,
            status: 'OPEN',
        },
    });

    if (existingSession) {
        throw new AppError('There is already an open session for this shop', 400);
    }

    // Create session and update shop
    const [session] = await prisma.$transaction([
        prisma.session.create({
            data: {
                shopId,
                userId: req.user.id,
                openingCash: parseFloat(openingCash),
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                shop: {
                    select: { id: true, name: true },
                },
            },
        }),
        prisma.shop.update({
            where: { id: shopId },
            data: { lastOpenTime: new Date() },
        }),
    ]);

    res.status(201).json(formatResponse(session, 'Session started successfully'));
});

// Close session
exports.closeSession = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { closingCash } = req.body;

    const session = await prisma.session.findUnique({
        where: { id },
    });

    if (!session) {
        throw new AppError('Session not found', 404);
    }

    if (session.status === 'CLOSED') {
        throw new AppError('Session is already closed', 400);
    }

    // Calculate total revenue from orders
    const orderStats = await prisma.order.aggregate({
        where: {
            sessionId: id,
            status: 'PAID',
        },
        _sum: { totalAmount: true },
        _count: true,
    });

    const totalRevenue = orderStats._sum.totalAmount || 0;
    const totalOrders = orderStats._count;

    // Update session and shop
    const [updatedSession] = await prisma.$transaction([
        prisma.session.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                closingCash: closingCash !== undefined ? parseFloat(closingCash) : null,
                totalRevenue,
                totalOrders,
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        }),
        prisma.shop.update({
            where: { id: session.shopId },
            data: { lastRevenue: totalRevenue },
        }),
    ]);

    res.json(formatResponse(updatedSession, 'Session closed successfully'));
});

// Get POS data (all data needed for offline-first POS)
exports.getPOSData = asyncHandler(async (req, res) => {
    const { shopId } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    // Get active session
    const session = await prisma.session.findFirst({
        where: {
            shopId,
            status: 'OPEN',
        },
    });

    if (!session) {
        throw new AppError('No active session found. Please start a session first.', 400);
    }

    // Get all POS data in parallel
    const [categories, products, customers, floors] = await Promise.all([
        prisma.category.findMany({
            where: { shopId },
            orderBy: { sequence: 'asc' },
        }),
        prisma.product.findMany({
            where: { shopId, isActive: true },
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
                variants: true,
            },
        }),
        prisma.customer.findMany({
            where: { shopId },
            orderBy: { name: 'asc' },
        }),
        prisma.floor.findMany({
            where: { shopId },
            include: {
                tables: {
                    where: { isActive: true },
                },
            },
            orderBy: { sequence: 'asc' },
        }),
    ]);

    res.json(formatResponse({
        session: {
            id: session.id,
            openedAt: session.openedAt,
            openingCash: session.openingCash,
        },
        categories,
        products,
        customers,
        floors,
    }));
});
