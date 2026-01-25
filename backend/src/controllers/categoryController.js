const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, CATEGORY_COLORS } = require('../utils/helpers');

// Get categories by query params (frontend pattern)
exports.getCategoriesByQuery = asyncHandler(async (req, res) => {
    const { shopId } = req.query;

    const where = {};

    // shopId is now optional - if not provided, returns all categories
    if (shopId) {
        where.shopId = shopId;
    }

    const categories = await prisma.category.findMany({
        where,
        include: {
            _count: {
                select: { products: true },
            },
        },
        orderBy: { sequence: 'asc' },
    });

    res.json(formatResponse(categories));
});

// Create category with shopId in body (frontend pattern)
exports.createCategoryWithBody = asyncHandler(async (req, res) => {
    const { shopId, name, color } = req.body;

    if (!name) {
        throw new AppError('Category name is required', 400);
    }

    // Get category count for sequence (global if no shopId)
    const categoryCount = await prisma.category.count({
        where: shopId ? { shopId } : {}
    });
    const defaultColor = CATEGORY_COLORS[categoryCount % CATEGORY_COLORS.length];

    const category = await prisma.category.create({
        data: {
            name,
            color: color || defaultColor,
            sequence: categoryCount,
            ...(shopId && { shopId }), // Only include shopId if provided
        },
    });

    res.status(201).json(formatResponse(category, 'Category created successfully'));
});

// Get all categories for a shop
exports.getCategories = asyncHandler(async (req, res) => {
    const { shopId } = req.params;

    const categories = await prisma.category.findMany({
        where: { shopId },
        include: {
            _count: {
                select: { products: true },
            },
        },
        orderBy: { sequence: 'asc' },
    });

    res.json(formatResponse(categories));
});

// Create category
exports.createCategory = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { name, color } = req.body;

    if (!name) {
        throw new AppError('Category name is required', 400);
    }

    // Get next sequence and color
    const categoryCount = await prisma.category.count({ where: { shopId } });
    const defaultColor = CATEGORY_COLORS[categoryCount % CATEGORY_COLORS.length];

    const category = await prisma.category.create({
        data: {
            name,
            color: color || defaultColor,
            sequence: categoryCount,
            shopId,
        },
    });

    res.status(201).json(formatResponse(category, 'Category created successfully'));
});

// Update category
exports.updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (color) updateData.color = color;

    const category = await prisma.category.update({
        where: { id },
        data: updateData,
    });

    res.json(formatResponse(category, 'Category updated successfully'));
});

// Resequence categories (drag & drop)
exports.resequenceCategories = asyncHandler(async (req, res) => {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
        throw new AppError('Categories array is required', 400);
    }

    // Update each category's sequence
    await Promise.all(
        categories.map((cat, index) =>
            prisma.category.update({
                where: { id: cat.id },
                data: { sequence: index },
            })
        )
    );

    res.json(formatResponse(null, 'Categories reordered successfully'));
});

// Delete category
exports.deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if category has products
    const productCount = await prisma.product.count({
        where: { categoryId: id },
    });

    if (productCount > 0) {
        throw new AppError(`Cannot delete category with ${productCount} products. Move or delete products first.`, 400);
    }

    await prisma.category.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Category deleted successfully'));
});
