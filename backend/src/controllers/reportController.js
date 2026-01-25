const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse } = require('../utils/helpers');
const { generateReportPDF } = require('../services/pdfService');

// Get dashboard analytics
exports.getDashboard = asyncHandler(async (req, res) => {
    const { shopId, period = 'today', responsible, sessionId, productId } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    // Calculate date range
    let startDate = new Date();
    let endDate = new Date();
    let periodLabel = 'Today';

    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'Today';
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = 'Yesterday';
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            periodLabel = 'Last 7 Days';
            break;
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            periodLabel = 'Last 30 Days';
            break;
        default:
            startDate.setHours(0, 0, 0, 0);
    }

    // Base where clause
    const orderWhere = {
        shopId,
        status: 'PAID',
        createdAt: {
            gte: startDate,
            lte: endDate,
        },
    };

    if (responsible) {
        orderWhere.session = { userId: responsible };
    }

    if (sessionId) {
        orderWhere.sessionId = sessionId;
    }

    // Get orders
    const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
            items: {
                include: {
                    product: {
                        select: { categoryId: true },
                    },
                },
            },
        },
    });

    // Calculate metrics
    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrder = totalOrders > 0 ? revenue / totalOrders : 0;

    // Sales by day (for chart)
    const salesByDay = {};
    orders.forEach(order => {
        const dateKey = order.createdAt.toISOString().split('T')[0];
        if (!salesByDay[dateKey]) {
            salesByDay[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
        }
        salesByDay[dateKey].orders += 1;
        salesByDay[dateKey].revenue += order.totalAmount;
    });
    const salesChart = Object.values(salesByDay).sort((a, b) => a.date.localeCompare(b.date));

    // Top selling products
    const productSales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    productId: item.productId,
                    name: item.productName,
                    quantity: 0,
                    revenue: 0,
                };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.subtotal;
        });
    });
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Top categories
    const categories = await prisma.category.findMany({
        where: { shopId },
        select: { id: true, name: true, color: true },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const categorySales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            const categoryId = item.product?.categoryId;
            if (categoryId) {
                const category = categoryMap.get(categoryId);
                if (!categorySales[categoryId]) {
                    categorySales[categoryId] = {
                        id: categoryId,
                        name: category?.name || 'Unknown',
                        color: category?.color || '#6366F1',
                        quantity: 0,
                        revenue: 0,
                    };
                }
                categorySales[categoryId].quantity += item.quantity;
                categorySales[categoryId].revenue += item.subtotal;
            }
        });
    });
    const topCategories = Object.values(categorySales)
        .sort((a, b) => b.revenue - a.revenue)
        .map(c => ({
            ...c,
            percentage: revenue > 0 ? Math.round((c.revenue / revenue) * 100) : 0,
        }));

    // Top orders (highest value)
    const topOrders = orders
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5)
        .map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            totalAmount: o.totalAmount,
            itemCount: o.items.length,
            createdAt: o.createdAt,
        }));

    // Get shop name
    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true },
    });

    res.json(formatResponse({
        shopName: shop?.name,
        period: periodLabel,
        dateRange: { start: startDate, end: endDate },
        summary: {
            totalOrders,
            revenue,
            averageOrder,
        },
        salesChart,
        topProducts,
        topCategories,
        topOrders,
    }));
});

// Export report as PDF
exports.exportReport = asyncHandler(async (req, res) => {
    const { shopId, period = 'today' } = req.query;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    // Get dashboard data (reuse logic)
    let startDate = new Date();
    let endDate = new Date();
    let periodLabel = period;

    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            periodLabel = new Date().toLocaleDateString();
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
            break;
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
            break;
        default:
            startDate.setHours(0, 0, 0, 0);
            periodLabel = new Date().toLocaleDateString();
    }

    const orders = await prisma.order.findMany({
        where: {
            shopId,
            status: 'PAID',
            createdAt: { gte: startDate, lte: endDate },
        },
        include: {
            items: {
                include: {
                    product: {
                        select: { categoryId: true },
                    },
                },
            },
        },
    });

    const totalOrders = orders.length;
    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrder = totalOrders > 0 ? revenue / totalOrders : 0;

    // Top products
    const productSales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!productSales[item.productId]) {
                productSales[item.productId] = {
                    name: item.productName,
                    quantity: 0,
                    revenue: 0,
                };
            }
            productSales[item.productId].quantity += item.quantity;
            productSales[item.productId].revenue += item.subtotal;
        });
    });
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // Top categories (Reuse logic)
    const categories = await prisma.category.findMany({
        where: { shopId },
        select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const categorySales = {};
    orders.forEach(order => {
        order.items.forEach(item => {
            const categoryId = item.product?.categoryId;
            if (categoryId) {
                const category = categoryMap.get(categoryId);
                if (!categorySales[categoryId]) {
                    categorySales[categoryId] = {
                        id: categoryId,
                        name: category?.name || 'Unknown',
                        quantity: 0,
                        revenue: 0,
                    };
                }
                categorySales[categoryId].quantity += item.quantity;
                categorySales[categoryId].revenue += item.subtotal;
            }
        });
    });
    const topCategories = Object.values(categorySales)
        .sort((a, b) => b.revenue - a.revenue)
        .map(c => ({
            ...c,
            percentage: revenue > 0 ? Math.round((c.revenue / revenue) * 100) : 0,
        }));

    const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true },
    });

    const pdfBuffer = await generateReportPDF({
        shopName: shop?.name || 'Shop',
        period: periodLabel,
        totalOrders,
        revenue,
        averageOrder,
        averageOrder,
        topProducts,
        topCategories,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${period}.pdf"`);
    res.send(pdfBuffer);
});
