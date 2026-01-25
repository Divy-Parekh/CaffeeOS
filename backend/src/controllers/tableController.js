const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse } = require('../utils/helpers');
const { generateTableQR, generateTableQRUrl } = require('../services/qrService');
const { generateQRSheetPDF } = require('../services/pdfService');

// Get tables for a floor
exports.getTables = asyncHandler(async (req, res) => {
    const { floorId } = req.params;

    const tables = await prisma.table.findMany({
        where: { floorId },
        orderBy: { name: 'asc' },
    });

    res.json(formatResponse(tables));
});

// Create table
exports.createTable = asyncHandler(async (req, res) => {
    const { floorId, name, capacity } = req.body;

    if (!floorId || !name || !capacity) {
        throw new AppError('Floor ID, name, and capacity are required', 400);
    }

    const table = await prisma.table.create({
        data: {
            name,
            capacity: parseInt(capacity),
            floorId,
        },
    });

    res.status(201).json(formatResponse(table, 'Table created successfully'));
});

// Update table
exports.updateTable = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, capacity, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (capacity) updateData.capacity = parseInt(capacity);
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const table = await prisma.table.update({
        where: { id },
        data: updateData,
    });

    res.json(formatResponse(table, 'Table updated successfully'));
});

// Bulk update tables (activate/deactivate)
exports.bulkUpdateTables = asyncHandler(async (req, res) => {
    const { tableIds, action } = req.body;

    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
        throw new AppError('Table IDs are required', 400);
    }

    if (!['activate', 'deactivate'].includes(action)) {
        throw new AppError('Action must be "activate" or "deactivate"', 400);
    }

    await prisma.table.updateMany({
        where: { id: { in: tableIds } },
        data: { isActive: action === 'activate' },
    });

    res.json(formatResponse(null, `Tables ${action}d successfully`));
});

// Delete table
exports.deleteTable = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.table.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Table deleted successfully'));
});

// Get single table QR code
exports.getTableQR = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
        where: { id },
        include: {
            floor: {
                include: {
                    shop: { select: { name: true } },
                },
            },
        },
    });

    if (!table) {
        throw new AppError('Table not found', 404);
    }

    // Dynamic origin
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;

    // Pass origin to services
    const qrDataUrl = await generateTableQR(table.token, origin);
    const qrUrl = generateTableQRUrl(table.token, origin);

    res.json(formatResponse({
        table: {
            id: table.id,
            name: table.name,
            token: table.token,
        },
        qrDataUrl,
        qrUrl,
        shopName: table.floor.shop.name,
    }));
});

// Validate table token (for mobile ordering)
exports.validateTableToken = asyncHandler(async (req, res) => {
    const { token } = req.params;

    const table = await prisma.table.findUnique({
        where: { token },
        include: {
            floor: {
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            themeColor: true,
                            mobileBgImages: true,
                            selfOrderEnabled: true,
                            qrMenuEnabled: true,
                            currency: true,
                            // Ensure payment settings are sent too if needed
                        },
                    },
                },
            },
        },
    });

    if (!table) {
        throw new AppError('Invalid table token', 404);
    }

    if (!table.isActive) {
        throw new AppError('Table is not active', 400);
    }

    res.json(formatResponse({
        table: {
            id: table.id,
            name: table.name,
            capacity: table.capacity,
            currentOccupancy: table.currentOccupancy,
        },
        floor: table.floor.name,
        shop: table.floor.shop,
    }));
});

// Download QR sheet for all tables in a shop
exports.downloadQRSheet = asyncHandler(async (req, res) => {
    const { shopId } = req.params;

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        include: {
            floors: {
                include: {
                    tables: {
                        where: { isActive: true },
                    },
                },
            },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    // Flatten all tables
    const allTables = shop.floors.flatMap(floor =>
        floor.tables.map(table => ({
            ...table,
            floorName: floor.name,
        }))
    );

    if (allTables.length === 0) {
        throw new AppError('No active tables found', 400);
    }

    // Dynamic origin
    const origin = req.get('origin') || `${req.protocol}://${req.get('host')}`;

    const pdfBuffer = await generateQRSheetPDF(allTables, shop.name, origin);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${shop.name}-qr-codes.pdf"`);
    res.send(pdfBuffer);
});
