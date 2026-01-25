const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse } = require('../utils/helpers');

// Get all floors for a shop
exports.getFloors = asyncHandler(async (req, res) => {
    const { shopId } = req.params;

    const floors = await prisma.floor.findMany({
        where: { shopId },
        include: {
            tables: {
                orderBy: { name: 'asc' },
            },
        },
        orderBy: { sequence: 'asc' },
    });

    res.json(formatResponse(floors));
});

// Create floor
exports.createFloor = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { name } = req.body;

    if (!name) {
        throw new AppError('Floor name is required', 400);
    }

    // Get next sequence number
    const lastFloor = await prisma.floor.findFirst({
        where: { shopId },
        orderBy: { sequence: 'desc' },
    });

    const floor = await prisma.floor.create({
        data: {
            name,
            shopId,
            sequence: lastFloor ? lastFloor.sequence + 1 : 0,
        },
        include: {
            tables: true,
        },
    });

    res.status(201).json(formatResponse(floor, 'Floor created successfully'));
});

// Update floor
exports.updateFloor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const floor = await prisma.floor.update({
        where: { id },
        data: { name },
        include: {
            tables: true,
        },
    });

    res.json(formatResponse(floor, 'Floor updated successfully'));
});

// Delete floor
exports.deleteFloor = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.floor.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Floor deleted successfully'));
});
