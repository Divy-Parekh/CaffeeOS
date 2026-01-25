const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Lakshadweep", "Puducherry", "Ladakh", "Jammu and Kashmir"
];

exports.getCustomers = async (req, res) => {
    try {
        const { shopId, search } = req.query;

        const where = {
            ...(shopId && { shopId }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ]
            })
        };

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: customers });
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customers' });
    }
};

exports.getCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, data: customer });
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customer' });
    }
};

exports.createCustomer = async (req, res) => {
    try {
        const { shopId, name, email, phone, address, city, state, country } = req.body;

        if (!shopId || !name) {
            return res.status(400).json({ success: false, message: 'Shop ID and Name are required' });
        }

        const customer = await prisma.customer.create({
            data: {
                shopId,
                name,
                email,
                phone,
                address,
                city,
                state,
                country: country || 'India'
            }
        });

        res.status(201).json({ success: true, data: customer });
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to create customer' });
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const customer = await prisma.customer.update({
            where: { id },
            data
        });

        res.json({ success: true, data: customer });
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to update customer' });
    }
};

exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.customer.delete({ where: { id } });
        res.json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete customer' });
    }
};

exports.bulkDeleteCustomers = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !ids.length) {
            return res.status(400).json({ success: false, message: 'No IDs provided' });
        }

        await prisma.customer.deleteMany({
            where: { id: { in: ids } }
        });

        res.json({ success: true, message: 'Customers deleted successfully' });
    } catch (error) {
        console.error('Bulk delete customers error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete customers' });
    }
};

exports.getCustomerOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await prisma.order.findMany({
            where: { customerId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                payments: true
            }
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch customer orders' });
    }
};

exports.getIndianStates = (req, res) => {
    res.json({ success: true, data: INDIAN_STATES });
};
