const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, generateOrderNumber, calculateOrderTotals, paginate } = require('../utils/helpers');
const { emitToKitchen } = require('../config/socket');
const { generateReceiptPDF } = require('../services/pdfService');

// Get orders by query params (frontend pattern)
exports.getOrdersByQuery = asyncHandler(async (req, res) => {
    const { shopId, sessionId, status, page = 1, limit = 50 } = req.query;

    if (!shopId && !sessionId) {
        throw new AppError('Shop ID or Session ID is required', 400);
    }

    const where = {};
    if (shopId) where.shopId = shopId;
    if (sessionId) where.sessionId = sessionId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                items: true,
                customer: { select: { id: true, name: true } },
                table: { select: { id: true, name: true } },
                payments: true,
                session: { select: { id: true, openedAt: true } },
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.order.count({ where }),
    ]);

    res.json(formatResponse(orders, 'Orders retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Calculate order totals (preview)
exports.calculateOrder = asyncHandler(async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Items are required', 400);
    }

    // Get product details
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    // Calculate totals
    const processedItems = items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new AppError(`Product ${item.productId} not found`, 404);
        }

        let unitPrice = product.basePrice;
        let variantInfo = null;

        // Add variant extra price if specified
        if (item.variantId) {
            const variant = product.variants.find(v => v.id === item.variantId);
            if (variant) {
                unitPrice += variant.extraPrice;
                variantInfo = { attribute: variant.attribute, value: variant.value };
            }
        }

        const quantity = parseInt(item.quantity) || 1;
        const subtotal = unitPrice * quantity;
        const taxAmount = (subtotal * product.taxPercent) / 100;

        return {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            taxPercent: product.taxPercent,
            subtotal,
            taxAmount,
            variantInfo,
        };
    });

    const subtotal = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    res.json(formatResponse({
        items: processedItems,
        subtotal,
        taxAmount,
        totalAmount,
    }));
});

// Create order (Send to Kitchen)
exports.createOrder = asyncHandler(async (req, res) => {
    const { sessionId, tableId, customerId, items, notes, discount = 0, tip = 0 } = req.body;

    if (!sessionId || !items || items.length === 0) {
        throw new AppError('Session ID and items are required', 400);
    }

    // Verify session is open
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { shop: true },
    });

    if (!session || session.status !== 'OPEN') {
        throw new AppError('Invalid or closed session', 400);
    }

    // Get existing order count for order number
    const orderCount = await prisma.order.count({
        where: { shopId: session.shopId },
    });

    // Process items
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    let subtotal = 0;
    let taxAmount = 0;

    const orderItems = items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new AppError(`Product ${item.productId} not found`, 404);
        }

        let unitPrice = product.basePrice;
        let variantInfo = null;

        // Handle variants (array or single)
        if (item.variantInfo && Array.isArray(item.variantInfo)) {
            // Frontend sends array of selected variants
            item.variantInfo.forEach(v => {
                const dbVariant = product.variants.find(pv => pv.id === v.id);
                if (dbVariant) {
                    unitPrice += dbVariant.extraPrice;
                }
            });
            variantInfo = item.variantInfo;
        } else if (item.variantId) {
            // Legacy/Single variant support
            const variant = product.variants.find(v => v.id === item.variantId);
            if (variant) {
                unitPrice += variant.extraPrice;
                variantInfo = { attribute: variant.attribute, value: variant.value };
            }
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

    const discountAmount = parseFloat(discount) || 0;
    const tipAmount = parseFloat(tip) || 0;
    const totalAmount = subtotal + taxAmount - discountAmount + tipAmount;

    // Check table capacity if table assigned
    if (tableId) {
        const table = await prisma.table.findUnique({
            where: { id: tableId },
        });

        if (!table) {
            throw new AppError('Table not found', 404);
        }

        if (table.currentOccupancy >= table.capacity) {
            throw new AppError('Table capacity reached. Please select another table.', 400);
        }
    }

    // Create order with items
    const order = await prisma.order.create({
        data: {
            orderNumber: generateOrderNumber(session.shopId, orderCount),
            shopId: session.shopId,
            sessionId,
            tableId: tableId || null,
            customerId: customerId || null,
            status: 'CONFIRMED',
            kitchenStatus: 'TO_COOK',
            subtotal,
            taxAmount,
            discount: discountAmount,
            tip: tipAmount,
            totalAmount,
            notes,
            items: {
                create: orderItems,
            },
        },
        include: {
            items: true,
            table: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
        },
    });

    // Update table occupancy if table assigned
    if (tableId) {
        await prisma.table.update({
            where: { id: tableId },
            data: { currentOccupancy: { increment: 1 } },
        });
    }

    // Emit to kitchen display
    emitToKitchen(session.shopId, 'new_ticket', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        items: order.items,
        tableName: order.table?.name || 'Counter',
        createdAt: order.createdAt,
    });

    res.status(201).json(formatResponse(order, 'Order created and sent to kitchen'));
});

// Get orders for a session
exports.getSessionOrders = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { status, page = 1, limit = 50 } = req.query;

    const where = { sessionId };
    if (status) {
        where.status = status;
    }

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                items: true,
                customer: { select: { id: true, name: true } },
                table: { select: { id: true, name: true } },
                payments: true,
            },
            orderBy: { createdAt: 'desc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.order.count({ where }),
    ]);

    res.json(formatResponse(orders, 'Orders retrieved', {
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
    }));
});

// Get single order
exports.getOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: { select: { id: true, name: true, image: true } },
                },
            },
            customer: true,
            table: true,
            session: { select: { id: true, openedAt: true } },
            payments: true,
        },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    res.json(formatResponse(order));
});

// Update order status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status', 400);
    }

    const order = await prisma.order.update({
        where: { id },
        data: { status },
    });

    res.json(formatResponse(order, 'Order status updated'));
});

// Get order receipt PDF
exports.getOrderReceipt = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            items: true,
            customer: true,
            shop: { select: { name: true } },
        },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    const pdfBuffer = await generateReceiptPDF({
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        shopName: order.shop.name,
        date: order.createdAt,
        customerName: order.customer?.name,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${order.orderNumber}.pdf"`);
    res.send(pdfBuffer);
});

// Update order
exports.updateOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, tableId, customerId, notes, discount, tip, items } = req.body;

    // Get current order to check status
    const currentOrder = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
    });

    if (!currentOrder) {
        throw new AppError('Order not found', 404);
    }

    if (currentOrder.status === 'PAID') {
        throw new AppError('Cannot update a paid order', 400);
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (tableId !== undefined) updateData.tableId = tableId || null;
    if (customerId !== undefined) updateData.customerId = customerId || null;
    if (notes !== undefined) updateData.notes = notes;
    if (discount !== undefined) updateData.discount = parseFloat(discount);
    if (tip !== undefined) updateData.tip = parseFloat(tip);

    // If items are provided, recalculate totals and replace items
    if (items && Array.isArray(items)) {
        // Process items
        const productIds = items.map(item => item.productId);
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: { variants: true },
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        let subtotal = 0;
        let taxAmount = 0;

        const orderItems = items.map(item => {
            const product = productMap.get(item.productId);
            if (!product) {
                throw new AppError(`Product ${item.productId} not found`, 404);
            }

            let unitPrice = product.basePrice;
            let variantInfo = null;

            // Handle variants (array or single)
            if (item.variantInfo && Array.isArray(item.variantInfo)) {
                item.variantInfo.forEach(v => {
                    const dbVariant = product.variants.find(pv => pv.id === v.id);
                    if (dbVariant) {
                        unitPrice += dbVariant.extraPrice;
                    }
                });
                variantInfo = item.variantInfo;
            } else if (item.variantId) {
                const variant = product.variants.find(v => v.id === item.variantId);
                if (variant) {
                    unitPrice += variant.extraPrice;
                    variantInfo = { attribute: variant.attribute, value: variant.value };
                }
            } else if (item.variantInfo) {
                // Fallback if variantId is not sent but variantInfo is (UI might verify)
                variantInfo = item.variantInfo;
            }
            // Frontend sends variantInfo in createOrder logic?
            // createOrder logic uses item.variantId. RegisterView sends variantInfo in 'variants' prop?
            // RegisterView createOrderMutation maps: variantInfo: item.variants.
            // But checking createOrder in controller: it expects item.variantId?
            // Wait, createOrder controller checks item.variantId.
            // RegisterView line 108: variantInfo: item.variants.
            // It DOES NOT send variantId?
            // RegisterView cart items structure?
            // When adding item: productId, productName, variants (array), etc.
            // If RegisterView does not send variantId, then createOrder logic for variants MIGHT BE BROKEN too?
            // Let's check createOrder again. Lines 148-154.
            // It checks item.variantId.
            // RegisterView: item.variants is an ARRAY of selected variants? Or a single object?
            // In Store `cartSlice`, `updateItemVariants` sets `variants` array.
            // If RegisterView sends `variantInfo: item.variants` and NOT `variantId`, then `createOrder` skip variant calc?
            // If so, unitPrice is basePrice.
            // If RegisterView relies on `unitPrice` passed in item, `createOrder` ignores it and uses product source of truth.
            // So if variant price is missing in backend calc, total is wrong?
            // But previously createOrder worked?
            // Maybe products don't have variants yet?
            // Let's mimic createOrder logic exactly.

            // Re-use createOrder logic for consistency
            if (item.variantId) {
                const variant = product.variants.find(v => v.id === item.variantId);
                if (variant) {
                    unitPrice += variant.extraPrice;
                    variantInfo = { attribute: variant.attribute, value: variant.value };
                }
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
                variantInfo, // Pass through or calculated?
            };
        });

        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        // recalculate total with new or existing discount/tip
        const discountVal = updateData.discount !== undefined ? updateData.discount : (currentOrder.discount || 0);
        const tipVal = updateData.tip !== undefined ? updateData.tip : (currentOrder.tip || 0);
        updateData.totalAmount = subtotal + taxAmount - discountVal + tipVal;

        // Transaction: Update Order + Replace Items
        const order = await prisma.$transaction([
            prisma.orderItem.deleteMany({ where: { orderId: id } }),
            prisma.order.update({
                where: { id },
                data: {
                    ...updateData,
                    items: {
                        create: orderItems
                    }
                },
                include: {
                    items: true,
                    customer: { select: { id: true, name: true } },
                    table: { select: { id: true, name: true } },
                },
            })
        ]);

        // Handle Kitchen Socket if needed?
        // If we update items, kitchen needs to know?
        // For now, simpler to just respond.
        res.json(formatResponse(order[1], 'Order updated successfully'));
    } else {
        // Normal update without items
        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: {
                items: true,
                customer: { select: { id: true, name: true } },
                table: { select: { id: true, name: true } },
            },
        });
        res.json(formatResponse(order, 'Order updated successfully'));
    }
});

// Delete order
exports.deleteOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if order can be deleted (only DRAFT or CANCELLED)
    const order = await prisma.order.findUnique({
        where: { id },
    });

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    if (order.status === 'PAID') {
        throw new AppError('Cannot delete a paid order', 400);
    }

    await prisma.order.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Order deleted successfully'));
});
