const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, paginate } = require('../utils/helpers');
const { emitToCustomerDisplay, emitToShop, emitToKitchen } = require('../config/socket');
const { generateUPIQR, generateUPIString } = require('../services/qrService');
const { sendReceiptEmail } = require('../services/emailService');

// Get payments by query params (frontend pattern)
exports.getPaymentsByQuery = asyncHandler(async (req, res) => {
    const { shopId, method, date, page = 1, limit = 50 } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    const where = {
        order: { shopId },
    };

    if (method) {
        where.method = method.toUpperCase();
    }

    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        where.createdAt = {
            gte: startDate,
            lte: endDate,
        };
    }

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        customer: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.payment.count({ where }),
    ]);

    res.json(formatResponse(payments, 'Payments retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Get UPI QR via GET (frontend pattern)
exports.getUPIQR = asyncHandler(async (req, res) => {
    const { shopId, amount } = req.query;

    if (!shopId || !amount) {
        throw new AppError('Shop ID and amount are required', 400);
    }

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true, upiId: true, isUpiEnabled: true },
    });

    if (!shop) {
        throw new AppError('Shop not found', 404);
    }

    if (!shop.isUpiEnabled || !shop.upiId) {
        throw new AppError('UPI is not enabled for this shop', 400);
    }

    const upiString = generateUPIString(
        shop.upiId,
        parseFloat(amount),
        `PAY-${Date.now()}`,
        shop.name
    );

    const qrDataUrl = await generateUPIQR(
        shop.upiId,
        parseFloat(amount),
        `PAY-${Date.now()}`,
        shop.name
    );

    res.json(formatResponse({
        qrDataUrl,
        qrData: upiString, // Send raw UPI string for frontend QR component
        amount: parseFloat(amount),
        upiId: shop.upiId,
    }));
});

// Validate and process payment
// Validate and process payment
exports.validatePayment = asyncHandler(async (req, res) => {
    const { orderId, payments, sendReceipt, receiptEmail } = req.body;

    if (!orderId || !payments || !Array.isArray(payments) || payments.length === 0) {
        throw new AppError('Order ID and payments are required', 400);
    }

    // Get order
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: true,
            session: true,
            shop: { select: { id: true, name: true } },
            customer: true,
        },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    // Calculate total paid amount from methods
    const paymentTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const orderTotal = parseFloat(order.totalAmount);

    // Backend implicitly trusts frontend validation now.
    // We log for debugging but do not block processing.
    console.log(`Processing payment: Paid=${paymentTotal}, Bill=${orderTotal}`);

    // Removed strict validation check as per user request to "not include backend" in validation.

    // If amounts match (or even if they don't, we trust frontend), proceed.
    // We still check if order is already paid to prevent double processing.
    if (order.status === 'PAID') {
        throw new AppError('Order is already paid', 400);
    }

    // Create payments and update order in transaction
    await prisma.$transaction([
        prisma.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
        }),
        ...payments.map(payment =>
            prisma.payment.create({
                data: {
                    orderId,
                    method: payment.method.toUpperCase(),
                    amount: parseFloat(payment.amount),
                    transactionId: payment.transactionId || null,
                },
            })
        ),
        // Update session revenue
        prisma.session.update({
            where: { id: order.sessionId },
            data: {
                totalRevenue: { increment: order.totalAmount },
                totalOrders: { increment: 1 },
            },
        }),
        // Update customer total sales if customer exists
        ...(order.customerId ? [
            prisma.customer.update({
                where: { id: order.customerId },
                data: { totalSales: { increment: order.totalAmount } },
            }),
        ] : []),
    ]);

    // Reset table occupancy if table was used
    if (order.tableId) {
        await prisma.table.update({
            where: { id: order.tableId },
            data: { currentOccupancy: 0 },
        });
    }

    // Emit socket events
    emitToCustomerDisplay(order.shop.id, 'payment_success', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
    });

    emitToShop(order.shop.id, 'payment_success', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'PAID',
    });

    emitToKitchen(order.shop.id, 'order_status_change', {
        orderId: order.id,
        status: 'PAID',
    });

    // Send receipt email if requested
    if (sendReceipt && (receiptEmail || order.customer?.email)) {
        const email = receiptEmail || order.customer.email;
        // Don't await email to speed up response
        sendReceiptEmail(email, {
            orderNumber: order.orderNumber,
            items: order.items,
            totalAmount: order.totalAmount,
            shopName: order.shop.name,
        }).catch(err => console.error('Email error:', err));
    }

    res.json(formatResponse({
        order: { id: order.id, orderNumber: order.orderNumber, status: 'PAID' },
        payments,
    }, 'Payment processed successfully'));
});

// Get payments with filters
exports.getPayments = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { method, date, page = 1, limit = 50 } = req.query;

    const where = {
        order: { shopId },
    };

    if (method) {
        where.method = method.toUpperCase();
    }

    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        where.createdAt = {
            gte: startDate,
            lte: endDate,
        };
    }

    const [payments, total] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        customer: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.payment.count({ where }),
    ]);

    res.json(formatResponse(payments, 'Payments retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Generate UPI payment QR
exports.generateUPIPaymentQR = asyncHandler(async (req, res) => {
    const { orderId } = req.body;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            shop: { select: { name: true, upiId: true, isUpiEnabled: true } },
        },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    if (!order.shop.isUpiEnabled || !order.shop.upiId) {
        throw new AppError('UPI is not enabled for this shop', 400);
    }

    const qrDataUrl = await generateUPIQR(
        order.shop.upiId,
        order.totalAmount,
        order.orderNumber,
        order.shop.name
    );

    res.json(formatResponse({
        qrDataUrl,
        amount: order.totalAmount,
        orderNumber: order.orderNumber,
        upiId: order.shop.upiId,
    }));
});
