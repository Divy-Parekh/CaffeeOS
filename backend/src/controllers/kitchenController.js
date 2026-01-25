const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, paginate } = require('../utils/helpers');
const { emitToShop, emitToOrder } = require('../config/socket');

// Get kitchen tickets by query params (frontend pattern)
exports.getTicketsByQuery = asyncHandler(async (req, res) => {
    const { shopId, status, search, page = 1, limit = 20 } = req.query;

    console.log('🍳 Kitchen Query:', { shopId, status, search, page, limit });

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    const where = {
        shopId,
        status: { in: ['CONFIRMED', 'PAID'] },
    };

    // Filter by kitchen status
    if (status === 'to_cook') {
        where.kitchenStatus = 'TO_COOK';
    } else if (status === 'preparing') {
        where.kitchenStatus = 'PREPARING';
    } else if (status === 'completed') {
        where.kitchenStatus = 'COMPLETED';
    } else {
        // Default: Show all active kitchen tickets (exclude served/delivered)
        where.kitchenStatus = { not: 'DELIVERED' };
    }

    if (search) {
        where.orderNumber = { contains: search, mode: 'insensitive' };
    }

    const [orders, total, counts] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, image: true } },
                    },
                },
                table: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.order.count({ where }),
        prisma.order.groupBy({
            by: ['kitchenStatus'],
            where: {
                shopId,
                status: { in: ['CONFIRMED', 'PAID'] }
            },
            _count: true,
        }),
    ]);

    const statusCounts = {
        all: 0,
        to_cook: 0,
        preparing: 0,
        completed: 0,
    };

    counts.forEach(c => {
        statusCounts[c.kitchenStatus.toLowerCase()] = c._count;
        statusCounts.all += c._count;
    });

    console.log(`🍳 Found ${orders.length} orders, counts:`, statusCounts);

    res.json(formatResponse({
        tickets: orders,
        counts: statusCounts,
    }, 'Kitchen tickets retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Get kitchen tickets
exports.getKitchenTickets = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { status, search, page = 1, limit = 20 } = req.query;

    const where = {
        shopId,
        status: { in: ['CONFIRMED', 'PAID'] },
    };

    // Filter by kitchen status
    if (status === 'to_cook') {
        where.kitchenStatus = 'TO_COOK';
    } else if (status === 'preparing') {
        where.kitchenStatus = 'PREPARING';
    } else if (status === 'completed') {
        where.kitchenStatus = 'COMPLETED';
    } else {
        // Default: Show all active kitchen tickets (exclude served/delivered)
        where.kitchenStatus = { not: 'DELIVERED' };
    }

    if (search) {
        where.orderNumber = { contains: search, mode: 'insensitive' };
    }

    const [orders, total, counts] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, image: true } },
                    },
                },
                table: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.order.count({ where }),
        // Get counts for each status
        prisma.order.groupBy({
            by: ['kitchenStatus'],
            where: {
                shopId,
                status: { in: ['CONFIRMED', 'PAID'] }
            },
            _count: true,
        }),
    ]);

    // Format counts
    const statusCounts = {
        all: 0,
        to_cook: 0,
        preparing: 0,
        completed: 0,
    };

    counts.forEach(c => {
        statusCounts[c.kitchenStatus.toLowerCase()] = c._count;
        statusCounts.all += c._count;
    });

    res.json(formatResponse({
        tickets: orders,
        counts: statusCounts,
    }, 'Kitchen tickets retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Update ticket status
exports.updateTicketStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ['TO_COOK', 'PREPARING', 'COMPLETED', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid kitchen status', 400);
    }

    const order = await prisma.order.update({
        where: { id: orderId },
        data: { kitchenStatus: status },
        include: {
            items: true,
            table: { select: { name: true } },
        },
    });

    // Emit to POS
    emitToShop(order.shopId, 'order_status_change', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        kitchenStatus: status,
        tableName: order.table?.name,
    });

    // Emit to mobile tracking
    emitToOrder(order.id, 'order_status_change', {
        orderId: order.id,
        status: order.status,
        kitchenStatus: status,
    });

    res.json(formatResponse(order, 'Ticket status updated'));
});

// Toggle item prepared status
exports.toggleItemPrepared = asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;
    const { isPrepared } = req.body;

    // Update item
    const item = await prisma.orderItem.update({
        where: { id: itemId },
        data: { isPrepared: isPrepared !== undefined ? isPrepared : true },
    });

    // Check if all items are prepared
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });

    const allPrepared = order.items.every(i => i.isPrepared);
    const somePrepared = order.items.some(i => i.isPrepared);

    // Auto-update ticket status based on items
    let newKitchenStatus = 'TO_COOK';
    if (allPrepared) {
        newKitchenStatus = 'COMPLETED';
    } else if (somePrepared) {
        newKitchenStatus = 'PREPARING';
    }

    if (order.kitchenStatus !== newKitchenStatus) {
        await prisma.order.update({
            where: { id: orderId },
            data: { kitchenStatus: newKitchenStatus },
        });

        // Emit update
        emitToShop(order.shopId, 'order_status_change', {
            orderId: order.id,
            kitchenStatus: newKitchenStatus,
        });

        // Emit to mobile tracking
        emitToOrder(order.id, 'order_status_change', {
            orderId: order.id,
            status: order.status,
            kitchenStatus: newKitchenStatus,
        });
    }

    // Emit item update
    emitToShop(order.shopId, 'item_prepared', {
        orderId,
        itemId,
        isPrepared: item.isPrepared,
    });

    res.json(formatResponse(item, 'Item status updated'));
});
