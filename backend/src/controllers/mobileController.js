const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, generateOrderNumber } = require('../utils/helpers');
const { emitToKitchen, emitToShop } = require('../config/socket');

// Get shop public info and tables (for online ordering landing page)
exports.getShopTables = asyncHandler(async (req, res) => {
    const { shopId } = req.params;

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: {
            id: true,
            name: true,
            logo: true,
            themeColor: true,
            mobileBgImages: true,
            onlineOrderEnabled: true,
            isUpiEnabled: true,
            currency: true,
            floors: {
                include: {
                    tables: {
                        where: { isActive: true },
                        orderBy: { name: 'asc' },
                        select: {
                            id: true,
                            name: true,
                            capacity: true,
                            token: true, // Only include token if it's safe or necessary for URL generation on frontend
                            // Note: Safest to just return token so frontend can link to /m/:token
                        },
                    },
                },
                orderBy: { sequence: 'asc' },
            },
        },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    if (!shop.onlineOrderEnabled) {
        throw new AppError('Online ordering is not enabled for this shop', 400);
    }

    res.json(formatResponse(shop));
});

// Get shop and table info by token (initial page load)
exports.getTableInfo = asyncHandler(async (req, res) => {
    const { tableToken } = req.params;

    const table = await prisma.table.findUnique({
        where: { token: tableToken },
        include: {
            floor: {
                include: {
                    shop: {
                        select: {
                            id: true,
                            name: true,
                            logo: true,
                            themeColor: true,
                            mobileBgImages: true,
                            selfOrderEnabled: true,
                            qrMenuEnabled: true,
                            currency: true,
                        },
                    },
                },
            },
        },
    });

    if (!table) {
        throw new AppError('Invalid table QR code', 404);
    }

    if (!table.isActive) {
        throw new AppError('This table is currently not available', 400);
    }

    const shop = table.floor.shop;
    if (!shop.selfOrderEnabled && !shop.qrMenuEnabled) {
        throw new AppError('Mobile ordering is not available for this shop', 400);
    }

    res.json(formatResponse({
        table: {
            id: table.id,
            name: table.name,
            capacity: table.capacity,
        },
        floorName: table.floor.name,
        shop: {
            id: shop.id,
            name: shop.name,
            logo: shop.logo,
            themeColor: shop.themeColor,
            bgImages: shop.mobileBgImages,
            currency: shop.currency,
            selfOrderEnabled: shop.selfOrderEnabled,
        },
    }));
});

// Get menu for mobile ordering
exports.getMobileMenu = asyncHandler(async (req, res) => {
    const { tableToken } = req.params;

    const table = await prisma.table.findUnique({
        where: { token: tableToken },
        include: {
            floor: {
                include: {
                    shop: {
                        select: { id: true },
                    },
                },
            },
        },
    });

    if (!table) {
        throw new AppError('Invalid table', 404);
    }

    const shopId = table.floor.shop.id;

    const [categories, products] = await Promise.all([
        prisma.category.findMany({
            // where: { shopId }, // Fetch all categories (shared)
            orderBy: { sequence: 'asc' },
        }),
        prisma.product.findMany({
            where: { isActive: true }, // Fetch all active products
            include: {
                category: { select: { id: true, name: true, color: true } },
                variants: true,
            },
            orderBy: { name: 'asc' },
        }),
    ]);

    res.json(formatResponse({
        categories,
        products,
        tableId: table.id,
        tableName: table.name,
    }));
});

// Place mobile order
exports.placeMobileOrder = asyncHandler(async (req, res) => {
    const { tableToken } = req.params;
    const { items, toppings = [] } = req.body;

    if (!items || items.length === 0) {
        throw new AppError('Items are required', 400);
    }

    // Get table and shop
    const table = await prisma.table.findUnique({
        where: { token: tableToken },
        include: {
            floor: {
                include: {
                    shop: {
                        include: {
                            sessions: {
                                where: { status: 'OPEN' },
                                take: 1,
                            },
                        },
                    },
                },
            },
        },
    });

    if (!table) {
        throw new AppError('Invalid table', 404);
    }

    const shop = table.floor.shop;
    const session = shop.sessions[0];

    if (!session) {
        throw new AppError('Shop is currently closed', 400);
    }

    // Get products
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Get order count
    const orderCount = await prisma.order.count({
        where: { shopId: shop.id },
    });

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new AppError(`Product not found`, 404);
        }

        let unitPrice = product.basePrice;
        let variantInfo = null;

        if (item.variantId) {
            const variant = product.variants.find(v => v.id === item.variantId);
            if (variant) {
                unitPrice += variant.extraPrice;
                variantInfo = { attribute: variant.attribute, value: variant.value };
            }
        }

        // Add toppings/extras if any
        if (item.toppings && Array.isArray(item.toppings)) {
            item.toppings.forEach(t => {
                unitPrice += parseFloat(t.price) || 0;
            });
            variantInfo = {
                ...variantInfo,
                toppings: item.toppings,
            };
        }

        const quantity = parseInt(item.quantity) || 1;
        const itemSubtotal = unitPrice * quantity;
        const itemTax = (itemSubtotal * product.taxPercent) / 100;

        subtotal += itemSubtotal;
        taxAmount += itemTax;

        return {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            taxAmount: itemTax,
            subtotal: itemSubtotal,
            variantInfo,
        };
    });

    const totalAmount = subtotal + taxAmount;

    // Determine status and payments based on method
    const isPayAtCounter = req.body.payments?.some(p => p.method === 'CASH');
    const orderStatus = isPayAtCounter ? 'CONFIRMED' : (req.body.payments?.length > 0 ? 'PAID' : 'CONFIRMED');

    // Create order
    const order = await prisma.order.create({
        data: {
            orderNumber: generateOrderNumber(shop.id, orderCount),
            shopId: shop.id,
            sessionId: session.id,
            tableId: table.id,
            status: orderStatus,
            kitchenStatus: 'TO_COOK',
            subtotal,
            taxAmount,
            totalAmount,
            isMobile: true,
            items: {
                create: orderItems,
            },
            // Only create payment records if NOT pay at counter (online payment)
            payments: (req.body.payments && !isPayAtCounter) ? {
                create: req.body.payments.map(p => ({
                    method: p.method,
                    amount: p.amount,
                    status: 'COMPLETED'
                }))
            } : undefined,
        },
        include: {
            items: true,
            table: { select: { name: true } },
            payments: true,
        },
    });

    // If paid (online), emit payment success
    if (order.payments?.length > 0) {
        emitToShop(shop.id, 'payment_success', {
            orderId: order.id,
            amount: order.totalAmount, // Assuming full payment
            method: order.payments[0].method,
        });
    }

    // Update table occupancy
    await prisma.table.update({
        where: { id: table.id },
        data: { currentOccupancy: { increment: 1 } },
    });

    // Emit to kitchen
    emitToKitchen(shop.id, 'new_ticket', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        items: order.items,
        tableName: order.table?.name,
        isMobile: true,
        createdAt: order.createdAt,
    });

    res.status(201).json(formatResponse({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.kitchenStatus,
    }, 'Order placed successfully'));
});

// Track order status
exports.trackOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                select: {
                    id: true,
                    productName: true,
                    quantity: true,
                    isPrepared: true,
                },
            },
            table: { select: { name: true } },
        },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    res.json(formatResponse({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        kitchenStatus: order.kitchenStatus,
        items: order.items,
        tableName: order.table?.name,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
    }));
});
