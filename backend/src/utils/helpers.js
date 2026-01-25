// Generate order number
const generateOrderNumber = (shopId, count) => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// Generate slug from name
const generateSlug = (name) => {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36);
};

// Calculate order totals
const calculateOrderTotals = (items) => {
    let subtotal = 0;
    let taxAmount = 0;

    const processedItems = items.map(item => {
        const itemSubtotal = item.unitPrice * item.quantity;
        const itemTax = (itemSubtotal * item.taxPercent) / 100;

        subtotal += itemSubtotal;
        taxAmount += itemTax;

        return {
            ...item,
            subtotal: itemSubtotal,
            taxAmount: itemTax,
        };
    });

    return {
        items: processedItems,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
    };
};

// Paginate results
const paginate = (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    return { skip, take: limit };
};

// Format response
const formatResponse = (data, message = 'Success', meta = {}) => {
    return {
        success: true,
        message,
        data,
        ...meta,
    };
};

// Indian states list
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Default category colors
const CATEGORY_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#6366F1', // Indigo
    '#14B8A6', // Teal
];

module.exports = {
    generateOrderNumber,
    generateSlug,
    calculateOrderTotals,
    paginate,
    formatResponse,
    INDIAN_STATES,
    CATEGORY_COLORS,
};
