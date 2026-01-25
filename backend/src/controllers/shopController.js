const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, generateSlug } = require('../utils/helpers');
const { getFileUrl } = require('../middlewares/upload.middleware');

// Get all shops for current user
exports.getShops = asyncHandler(async (req, res) => {
    const shops = await prisma.shop.findMany({
        where: {
            users: {
                some: { id: req.user.id },
            },
        },
        include: {
            _count: {
                select: {
                    floors: true,
                    products: true,
                    orders: true,
                },
            },
            sessions: {
                where: { status: 'OPEN' },
                orderBy: { openedAt: 'desc' },
                take: 1,
                select: {
                    id: true,
                    status: true,
                    openedAt: true,
                    totalRevenue: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Format response with session info
    const formattedShops = shops.map(shop => ({
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        logo: shop.logo,
        lastOpenTime: shop.lastOpenTime,
        lastRevenue: shop.lastRevenue,
        currency: shop.currency,
        activeSession: shop.sessions[0] || null,
        stats: {
            floors: shop._count.floors,
            products: shop._count.products,
            orders: shop._count.orders,
        },
    }));

    res.json(formatResponse(formattedShops));
});

// Get single shop
exports.getShop = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const shop = await prisma.shop.findFirst({
        where: {
            id,
            users: { some: { id: req.user.id } },
        },
        include: {
            floors: {
                include: {
                    tables: true,
                },
            },
            categories: {
                orderBy: { sequence: 'asc' },
            },
            _count: {
                select: {
                    products: true,
                    customers: true,
                    orders: true,
                },
            },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    res.json(formatResponse(shop));
});

// Create shop
exports.createShop = asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
        throw new AppError('Shop name is required', 400);
    }

    const shop = await prisma.shop.create({
        data: {
            name,
            slug: generateSlug(name),
            users: {
                connect: { id: req.user.id },
            },
        },
    });

    res.status(201).json(formatResponse(shop, 'Shop created successfully'));
});

// Update shop
exports.updateShop = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, currency } = req.body;

    // Check access
    const shop = await prisma.shop.findFirst({
        where: {
            id,
            users: { some: { id: req.user.id } },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (currency) updateData.currency = currency;

    // Handle logo upload
    if (req.file) {
        updateData.logo = getFileUrl(req.file.filename, 'logos');
    }

    const updatedShop = await prisma.shop.update({
        where: { id },
        data: updateData,
    });

    res.json(formatResponse(updatedShop, 'Shop updated successfully'));
});

// Update shop settings (payment/mobile)
exports.updateShopSettings = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        isCashEnabled,
        isUpiEnabled,
        isDigitalEnabled,
        upiId,
        bankDetails,
        selfOrderEnabled,
        qrMenuEnabled,
        onlineOrderEnabled,
        themeColor,
        paymentMode,
    } = req.body;

    // Check access
    const shop = await prisma.shop.findFirst({
        where: {
            id,
            users: { some: { id: req.user.id } },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    const updateData = {};

    // Payment settings
    if (typeof isCashEnabled === 'boolean') updateData.isCashEnabled = isCashEnabled;
    if (typeof isUpiEnabled === 'boolean') updateData.isUpiEnabled = isUpiEnabled;
    if (typeof isDigitalEnabled === 'boolean') updateData.isDigitalEnabled = isDigitalEnabled;
    if (upiId !== undefined) updateData.upiId = upiId;
    if (bankDetails !== undefined) updateData.bankDetails = bankDetails;

    // Mobile settings
    if (typeof selfOrderEnabled === 'boolean') updateData.selfOrderEnabled = selfOrderEnabled;
    if (typeof qrMenuEnabled === 'boolean') updateData.qrMenuEnabled = qrMenuEnabled;
    if (typeof onlineOrderEnabled === 'boolean') updateData.onlineOrderEnabled = onlineOrderEnabled;
    if (themeColor) updateData.themeColor = themeColor;
    if (paymentMode) updateData.paymentMode = paymentMode;

    // Handle background images
    if (req.files && req.files.length > 0) {
        const bgUrls = req.files.map(file => getFileUrl(file.filename, 'backgrounds'));
        updateData.mobileBgImages = bgUrls;
    }

    const updatedShop = await prisma.shop.update({
        where: { id },
        data: updateData,
    });

    res.json(formatResponse(updatedShop, 'Settings updated successfully'));
});

// Delete shop
exports.deleteShop = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check access (only admin can delete)
    const shop = await prisma.shop.findFirst({
        where: {
            id,
            users: { some: { id: req.user.id } },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    await prisma.shop.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Shop deleted successfully'));
});
