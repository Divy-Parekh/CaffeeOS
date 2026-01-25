const prisma = require('../config/database');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { formatResponse, paginate } = require('../utils/helpers');
const { getFileUrl } = require('../middlewares/upload.middleware');
const { uploadFile: uploadToImageKit, isConfigured: isImageKitConfigured } = require('../services/imagekit.service');

// Get products by query params (frontend pattern)
exports.getProductsByQuery = asyncHandler(async (req, res) => {
    const { shopId, category, categoryId, search, page = 1, limit = 50, active } = req.query;

    const where = {};

    // shopId is now optional - if not provided, returns all products
    if (shopId) {
        where.shopId = shopId;
    }

    // Support both 'category' and 'categoryId' params
    if (category || categoryId) {
        where.categoryId = category || categoryId;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (active !== undefined) {
        where.isActive = active === 'true';
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
                variants: true,
            },
            orderBy: { name: 'asc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.product.count({ where }),
    ]);

    res.json(formatResponse(products, 'Products retrieved', {
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    }));
});

// Create product with shopId in body (frontend pattern)
exports.createProductWithBody = asyncHandler(async (req, res) => {
    const { shopId, name, categoryId, basePrice, taxPercent, uom, description, variants } = req.body;

    if (!shopId) {
        throw new AppError('Shop ID is required', 400);
    }

    if (!name || !categoryId || !basePrice) {
        throw new AppError('Name, category, and price are required', 400);
    }

    const productData = {
        name,
        categoryId,
        shopId,
        basePrice: parseFloat(basePrice),
        taxPercent: parseFloat(taxPercent) || 0,
        uom: uom || 'unit',
        description,
    };

    // Handle image upload - try ImageKit first, fallback to local
    if (req.files && req.files.image && req.files.image[0]) {
        const file = req.files.image[0];
        if (isImageKitConfigured()) {
            const imageKitUrl = await uploadToImageKit(file, '/products');
            if (imageKitUrl) {
                productData.image = imageKitUrl;
            } else {
                // Fallback to local storage if ImageKit upload fails
                productData.image = getFileUrl(file.filename, 'products');
            }
        } else {
            // Use local storage
            productData.image = getFileUrl(file.filename, 'products');
        }
    } else if (req.body.image) {
        // Accept image URL directly from body
        productData.image = req.body.image;
    }

    const product = await prisma.product.create({
        data: productData,
        include: {
            category: true,
        },
    });

    if (variants) {
        const variantsArray = typeof variants === 'string' ? JSON.parse(variants) : variants;

        if (Array.isArray(variantsArray) && variantsArray.length > 0) {
            await prisma.productVariant.createMany({
                data: variantsArray.map(v => ({
                    productId: product.id,
                    attribute: v.attribute,
                    value: v.value,
                    unit: v.unit || null,
                    extraPrice: parseFloat(v.extraPrice) || 0,
                })),
            });
        }
    }

    const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
            category: true,
            variants: true,
        },
    });

    res.status(201).json(formatResponse(fullProduct, 'Product created successfully'));
});

// Get all products for a shop
exports.getProducts = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { category, search, page = 1, limit = 50, active } = req.query;

    const where = { shopId };

    if (category) {
        where.categoryId = category;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    if (active !== undefined) {
        where.isActive = active === 'true';
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: {
                category: {
                    select: { id: true, name: true, color: true },
                },
                variants: true,
            },
            orderBy: { name: 'asc' },
            ...paginate(parseInt(page), parseInt(limit)),
        }),
        prisma.product.count({ where }),
    ]);

    res.json(formatResponse(products, 'Products retrieved', {
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
        },
    }));
});

// Get single product
exports.getProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            category: true,
            variants: true,
        },
    });

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    res.json(formatResponse(product));
});

// Create product
exports.createProduct = asyncHandler(async (req, res) => {
    const { shopId } = req.params;
    const { name, categoryId, basePrice, taxPercent, uom, description, variants } = req.body;

    if (!name || !categoryId || !basePrice) {
        throw new AppError('Name, category, and price are required', 400);
    }

    const productData = {
        name,
        categoryId,
        shopId,
        basePrice: parseFloat(basePrice),
        taxPercent: parseFloat(taxPercent) || 0,
        uom: uom || 'unit',
        description,
    };

    // Handle file uploads
    if (req.files) {
        if (req.files.image && req.files.image[0]) {
            productData.image = getFileUrl(req.files.image[0].filename, 'products');
        }
        if (req.files.model3d && req.files.model3d[0]) {
            productData.model3d = getFileUrl(req.files.model3d[0].filename, 'models');
        }
    }

    // Create product
    const product = await prisma.product.create({
        data: productData,
        include: {
            category: true,
        },
    });

    // Create variants if provided
    if (variants) {
        const variantsArray = typeof variants === 'string' ? JSON.parse(variants) : variants;

        if (Array.isArray(variantsArray) && variantsArray.length > 0) {
            await prisma.productVariant.createMany({
                data: variantsArray.map(v => ({
                    productId: product.id,
                    attribute: v.attribute,
                    value: v.value,
                    unit: v.unit || null,
                    extraPrice: parseFloat(v.extraPrice) || 0,
                })),
            });
        }
    }

    // Fetch product with variants
    const fullProduct = await prisma.product.findUnique({
        where: { id: product.id },
        include: {
            category: true,
            variants: true,
        },
    });

    res.status(201).json(formatResponse(fullProduct, 'Product created successfully'));
});

// Update product
exports.updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, categoryId, basePrice, taxPercent, uom, description, isActive } = req.body;

    const updateData = {};

    if (name) updateData.name = name;
    if (categoryId) updateData.categoryId = categoryId;
    if (basePrice !== undefined) updateData.basePrice = parseFloat(basePrice);
    if (taxPercent !== undefined) updateData.taxPercent = parseFloat(taxPercent);
    if (uom) updateData.uom = uom;
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    // Handle image upload - try ImageKit first, fallback to local
    if (req.files && req.files.image && req.files.image[0]) {
        const file = req.files.image[0];
        if (isImageKitConfigured()) {
            const imageKitUrl = await uploadToImageKit(file, '/products');
            if (imageKitUrl) {
                updateData.image = imageKitUrl;
            } else {
                // Fallback to local storage if ImageKit upload fails
                updateData.image = getFileUrl(file.filename, 'products');
            }
        } else {
            // Use local storage
            updateData.image = getFileUrl(file.filename, 'products');
        }
    } else if (req.body.image !== undefined) {
        // Accept image URL directly from body
        updateData.image = req.body.image;
    }

    const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
            category: true,
            variants: true,
        },
    });

    res.json(formatResponse(product, 'Product updated successfully'));
});

// Delete product
exports.deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.product.delete({
        where: { id },
    });

    res.json(formatResponse(null, 'Product deleted successfully'));
});

// Add variant to product
exports.addVariant = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { attribute, value, unit, extraPrice } = req.body;

    if (!attribute || !value) {
        throw new AppError('Attribute and value are required', 400);
    }

    const variant = await prisma.productVariant.create({
        data: {
            productId: id,
            attribute,
            value,
            unit,
            extraPrice: parseFloat(extraPrice) || 0,
        },
    });

    res.status(201).json(formatResponse(variant, 'Variant added successfully'));
});

// Delete variant
exports.deleteVariant = asyncHandler(async (req, res) => {
    const { variantId } = req.params;

    await prisma.productVariant.delete({
        where: { id: variantId },
    });

    res.json(formatResponse(null, 'Variant deleted successfully'));
});
