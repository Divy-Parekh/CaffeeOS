const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const CATEGORY_COLORS = [
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4',
    '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
];

async function main() {
    console.log('🌱 Starting comprehensive seed...\n');

    // ============================================
    // 0. CLEAR EXISTING DATA (in correct order)
    // ============================================
    console.log('🗑️  Clearing existing data...');
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.session.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.table.deleteMany();
    await prisma.floor.deleteMany();
    await prisma.shop.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Cleared existing data\n');

    // ============================================
    // 1. CREATE ADMIN USER
    // ============================================
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@caffeeos.com' },
        update: {},
        create: {
            email: 'admin@caffeeos.com',
            password: hashedPassword,
            name: 'Admin User',
            role: 'ADMIN',
            isActive: true,
            isVerified: true,
        },
    });
    console.log('✅ Created admin user:', admin.email);

    // Create staff user
    const staff = await prisma.user.upsert({
        where: { email: 'staff@caffeeos.com' },
        update: {},
        create: {
            email: 'staff@caffeeos.com',
            password: hashedPassword,
            name: 'John Staff',
            role: 'STAFF',
            isActive: true,
            isVerified: true,
        },
    });
    console.log('✅ Created staff user:', staff.email);

    // ============================================
    // 2. CREATE SHOP
    // ============================================
    const shop = await prisma.shop.upsert({
        where: { slug: 'demo-cafe' },
        update: {},
        create: {
            name: 'Demo Cafe',
            slug: 'demo-cafe',
            currency: 'INR',
            isCashEnabled: true,
            isUpiEnabled: true,
            upiId: 'demo@upi',
            selfOrderEnabled: true,
            qrMenuEnabled: true,
            themeColor: '#4F46E5',
            users: {
                connect: [{ id: admin.id }, { id: staff.id }],
            },
        },
    });
    console.log('✅ Created shop:', shop.name);

    // ============================================
    // 3. CREATE FLOORS
    // ============================================
    const mainFloor = await prisma.floor.upsert({
        where: { id: 'floor-main' },
        update: {},
        create: {
            id: 'floor-main',
            name: 'Main Floor',
            sequence: 0,
            shopId: shop.id,
        },
    });

    const rooftop = await prisma.floor.upsert({
        where: { id: 'floor-rooftop' },
        update: {},
        create: {
            id: 'floor-rooftop',
            name: 'Rooftop',
            sequence: 1,
            shopId: shop.id,
        },
    });

    const garden = await prisma.floor.upsert({
        where: { id: 'floor-garden' },
        update: {},
        create: {
            id: 'floor-garden',
            name: 'Garden Area',
            sequence: 2,
            shopId: shop.id,
        },
    });
    console.log('✅ Created 3 floors');

    // ============================================
    // 4. CREATE TABLES
    // ============================================
    const tables = [];

    // Main floor tables (8 tables)
    for (let i = 1; i <= 8; i++) {
        const table = await prisma.table.upsert({
            where: { token: `table-main-${i}` },
            update: {},
            create: {
                name: `Table ${i}`,
                capacity: i <= 4 ? 2 : 4,
                token: `table-main-${i}`,
                floorId: mainFloor.id,
            },
        });
        tables.push(table);
    }

    // Rooftop tables (5 tables)
    for (let i = 1; i <= 5; i++) {
        const table = await prisma.table.upsert({
            where: { token: `table-roof-${i}` },
            update: {},
            create: {
                name: `Rooftop ${i}`,
                capacity: 4,
                token: `table-roof-${i}`,
                floorId: rooftop.id,
            },
        });
        tables.push(table);
    }

    // Garden tables (4 tables)
    for (let i = 1; i <= 4; i++) {
        const table = await prisma.table.upsert({
            where: { token: `table-garden-${i}` },
            update: {},
            create: {
                name: `Garden ${i}`,
                capacity: 6,
                token: `table-garden-${i}`,
                floorId: garden.id,
            },
        });
        tables.push(table);
    }
    console.log('✅ Created 17 tables');

    // ============================================
    // 5. CREATE CATEGORIES
    // ============================================
    const categoryNames = [
        'Hot Beverages', 'Cold Beverages', 'Snacks', 'Desserts',
        'Main Course', 'Breakfast', 'Mocktails', 'Smoothies'
    ];
    const categories = [];

    for (let i = 0; i < categoryNames.length; i++) {
        const category = await prisma.category.upsert({
            where: {
                shopId_name: {
                    shopId: shop.id,
                    name: categoryNames[i],
                },
            },
            update: {},
            create: {
                name: categoryNames[i],
                color: CATEGORY_COLORS[i],
                sequence: i,
                shopId: shop.id,
            },
        });
        categories.push(category);
    }
    console.log('✅ Created 8 categories');

    // ============================================
    // 6. CREATE PRODUCTS WITH VARIANTS
    // ============================================
    const productsData = [
        // Hot Beverages (0)
        { name: 'Espresso', price: 120, tax: 5, category: 0, uom: 'cup' },
        { name: 'Cappuccino', price: 180, tax: 5, category: 0, uom: 'cup' },
        { name: 'Latte', price: 200, tax: 5, category: 0, uom: 'cup' },
        { name: 'Americano', price: 150, tax: 5, category: 0, uom: 'cup' },
        { name: 'Mocha', price: 220, tax: 5, category: 0, uom: 'cup' },
        { name: 'Hot Chocolate', price: 180, tax: 5, category: 0, uom: 'cup' },
        { name: 'Green Tea', price: 100, tax: 5, category: 0, uom: 'cup' },
        { name: 'Masala Chai', price: 80, tax: 5, category: 0, uom: 'cup' },

        // Cold Beverages (1)
        { name: 'Iced Coffee', price: 180, tax: 5, category: 1, uom: 'glass' },
        { name: 'Cold Brew', price: 220, tax: 5, category: 1, uom: 'glass' },
        { name: 'Iced Latte', price: 220, tax: 5, category: 1, uom: 'glass' },
        { name: 'Lemonade', price: 100, tax: 5, category: 1, uom: 'glass' },
        { name: 'Iced Tea', price: 120, tax: 5, category: 1, uom: 'glass' },
        { name: 'Cold Coffee', price: 160, tax: 5, category: 1, uom: 'glass' },

        // Snacks (2)
        { name: 'Croissant', price: 120, tax: 12, category: 2, uom: 'piece' },
        { name: 'Veggie Sandwich', price: 180, tax: 12, category: 2, uom: 'piece' },
        { name: 'Chicken Sandwich', price: 220, tax: 12, category: 2, uom: 'piece' },
        { name: 'Muffin', price: 100, tax: 12, category: 2, uom: 'piece' },
        { name: 'Samosa', price: 40, tax: 12, category: 2, uom: 'piece' },
        { name: 'French Fries', price: 150, tax: 12, category: 2, uom: 'plate' },
        { name: 'Garlic Bread', price: 180, tax: 12, category: 2, uom: 'plate' },

        // Desserts (3)
        { name: 'Brownie', price: 150, tax: 12, category: 3, uom: 'piece' },
        { name: 'Cheesecake', price: 250, tax: 12, category: 3, uom: 'slice' },
        { name: 'Chocolate Cake', price: 200, tax: 12, category: 3, uom: 'slice' },
        { name: 'Tiramisu', price: 280, tax: 12, category: 3, uom: 'slice' },
        { name: 'Ice Cream Sundae', price: 220, tax: 12, category: 3, uom: 'bowl' },

        // Main Course (4)
        { name: 'Pasta Alfredo', price: 320, tax: 12, category: 4, uom: 'plate' },
        { name: 'Margherita Pizza', price: 350, tax: 12, category: 4, uom: 'plate' },
        { name: 'Pepperoni Pizza', price: 450, tax: 12, category: 4, uom: 'plate' },
        { name: 'Chicken Burger', price: 280, tax: 12, category: 4, uom: 'piece' },
        { name: 'Veggie Burger', price: 220, tax: 12, category: 4, uom: 'piece' },
        { name: 'Caesar Salad', price: 250, tax: 12, category: 4, uom: 'bowl' },

        // Breakfast (5)
        { name: 'Pancakes', price: 200, tax: 12, category: 5, uom: 'plate' },
        { name: 'Waffles', price: 220, tax: 12, category: 5, uom: 'plate' },
        { name: 'Eggs Benedict', price: 280, tax: 12, category: 5, uom: 'plate' },
        { name: 'Avocado Toast', price: 250, tax: 12, category: 5, uom: 'plate' },
        { name: 'Omelette', price: 180, tax: 12, category: 5, uom: 'plate' },

        // Mocktails (6)
        { name: 'Virgin Mojito', price: 180, tax: 5, category: 6, uom: 'glass' },
        { name: 'Blue Lagoon', price: 200, tax: 5, category: 6, uom: 'glass' },
        { name: 'Shirley Temple', price: 180, tax: 5, category: 6, uom: 'glass' },
        { name: 'Fruit Punch', price: 160, tax: 5, category: 6, uom: 'glass' },

        // Smoothies (7)
        { name: 'Mango Smoothie', price: 180, tax: 5, category: 7, uom: 'glass' },
        { name: 'Berry Blast', price: 200, tax: 5, category: 7, uom: 'glass' },
        { name: 'Banana Shake', price: 160, tax: 5, category: 7, uom: 'glass' },
        { name: 'Oreo Shake', price: 220, tax: 5, category: 7, uom: 'glass' },
    ];

    const products = [];
    for (const p of productsData) {
        const product = await prisma.product.upsert({
            where: { id: `product-${p.name.toLowerCase().replace(/\s/g, '-')}` },
            update: {},
            create: {
                id: `product-${p.name.toLowerCase().replace(/\s/g, '-')}`,
                name: p.name,
                basePrice: p.price,
                taxPercent: p.tax,
                uom: p.uom,
                categoryId: categories[p.category].id,
                shopId: shop.id,
            },
        });
        products.push(product);
    }
    console.log('✅ Created', products.length, 'products');

    // Add variants to some products
    const variantsData = [
        { productIndex: 0, attribute: 'Size', value: 'Large', extraPrice: 30 },
        { productIndex: 1, attribute: 'Size', value: 'Regular', extraPrice: 0 },
        { productIndex: 1, attribute: 'Size', value: 'Large', extraPrice: 40 },
        { productIndex: 2, attribute: 'Milk', value: 'Oat Milk', extraPrice: 30 },
        { productIndex: 2, attribute: 'Milk', value: 'Almond Milk', extraPrice: 40 },
        { productIndex: 8, attribute: 'Size', value: 'Large', extraPrice: 40 },
        { productIndex: 27, attribute: 'Size', value: 'Medium', extraPrice: 0 },
        { productIndex: 27, attribute: 'Size', value: 'Large', extraPrice: 100 },
    ];

    for (const v of variantsData) {
        await prisma.productVariant.create({
            data: {
                productId: products[v.productIndex].id,
                attribute: v.attribute,
                value: v.value,
                extraPrice: v.extraPrice,
            },
        });
    }
    console.log('✅ Created product variants');

    // ============================================
    // 7. CREATE CUSTOMERS
    // ============================================
    const customersData = [
        { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+91 9876543210', city: 'Mumbai', state: 'Maharashtra' },
        { name: 'Priya Patel', email: 'priya@example.com', phone: '+91 9876543211', city: 'Ahmedabad', state: 'Gujarat' },
        { name: 'Amit Singh', email: 'amit@example.com', phone: '+91 9876543212', city: 'Delhi', state: 'Delhi' },
        { name: 'Sneha Reddy', email: 'sneha@example.com', phone: '+91 9876543213', city: 'Hyderabad', state: 'Telangana' },
        { name: 'Vijay Kumar', email: 'vijay@example.com', phone: '+91 9876543214', city: 'Chennai', state: 'Tamil Nadu' },
        { name: 'Anita Gupta', email: 'anita@example.com', phone: '+91 9876543215', city: 'Kolkata', state: 'West Bengal' },
        { name: 'Rajesh Verma', email: 'rajesh@example.com', phone: '+91 9876543216', city: 'Pune', state: 'Maharashtra' },
        { name: 'Neha Desai', email: 'neha@example.com', phone: '+91 9876543217', city: 'Bangalore', state: 'Karnataka' },
        { name: 'Arun Mehta', email: 'arun@example.com', phone: '+91 9876543218', city: 'Jaipur', state: 'Rajasthan' },
        { name: 'Kavita Nair', email: 'kavita@example.com', phone: '+91 9876543219', city: 'Kochi', state: 'Kerala' },
    ];

    const customers = [];
    for (let i = 0; i < customersData.length; i++) {
        const c = customersData[i];
        const customer = await prisma.customer.upsert({
            where: { id: `customer-${i + 1}` },
            update: {},
            create: {
                id: `customer-${i + 1}`,
                name: c.name,
                email: c.email,
                phone: c.phone,
                city: c.city,
                state: c.state,
                country: 'India',
                shopId: shop.id,
            },
        });
        customers.push(customer);
    }
    console.log('✅ Created 10 customers');

    // ============================================
    // 8. CREATE SESSIONS WITH ORDERS
    // ============================================

    // Create a closed session from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0);

    const closedSession = await prisma.session.create({
        data: {
            shopId: shop.id,
            userId: admin.id,
            status: 'CLOSED',
            openedAt: yesterday,
            closedAt: new Date(yesterday.getTime() + 10 * 60 * 60 * 1000), // 10 hours later
            openingCash: 5000,
            closingCash: 25000,
            totalRevenue: 18500,
            totalOrders: 25,
        },
    });
    console.log('✅ Created closed session (yesterday)');

    // Create orders for closed session
    const orderStatuses = ['PAID', 'PAID', 'PAID', 'PAID', 'CANCELLED'];
    const kitchenStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED'];

    for (let i = 1; i <= 25; i++) {
        const orderTime = new Date(yesterday.getTime() + Math.random() * 10 * 60 * 60 * 1000);
        const numItems = Math.floor(Math.random() * 4) + 1;
        const selectedProducts = [];

        for (let j = 0; j < numItems; j++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            selectedProducts.push({
                product: randomProduct,
                quantity: Math.floor(Math.random() * 3) + 1,
            });
        }

        let subtotal = 0;
        let taxAmount = 0;
        const items = selectedProducts.map(sp => {
            const itemSubtotal = sp.product.basePrice * sp.quantity;
            const itemTax = (itemSubtotal * sp.product.taxPercent) / 100;
            subtotal += itemSubtotal;
            taxAmount += itemTax;
            return {
                productId: sp.product.id,
                productName: sp.product.name,
                quantity: sp.quantity,
                unitPrice: sp.product.basePrice,
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                isPrepared: true,
            };
        });

        const totalAmount = subtotal + taxAmount;
        const status = i <= 22 ? 'PAID' : 'CANCELLED';
        const customerId = Math.random() > 0.5 ? customers[Math.floor(Math.random() * customers.length)].id : null;
        const tableId = Math.random() > 0.3 ? tables[Math.floor(Math.random() * tables.length)].id : null;

        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD-${yesterday.toISOString().split('T')[0].replace(/-/g, '')}-${String(i).padStart(4, '0')}`,
                shopId: shop.id,
                sessionId: closedSession.id,
                tableId,
                customerId,
                status,
                kitchenStatus: 'COMPLETED',
                subtotal,
                taxAmount,
                totalAmount,
                createdAt: orderTime,
                items: {
                    create: items,
                },
            },
        });

        // Create payment for paid orders
        if (status === 'PAID') {
            const paymentMethods = ['CASH', 'UPI', 'CARD'];
            await prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
                    amount: totalAmount,
                    status: 'COMPLETED',
                    createdAt: orderTime,
                },
            });
        }
    }
    console.log('✅ Created 25 orders for yesterday session');

    // Create an open session for today
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const openSession = await prisma.session.create({
        data: {
            shopId: shop.id,
            userId: admin.id,
            status: 'OPEN',
            openedAt: today,
            openingCash: 5000,
            totalRevenue: 0,
            totalOrders: 0,
        },
    });
    console.log('✅ Created open session (today)');

    // Create a few orders for today's session
    for (let i = 1; i <= 5; i++) {
        const orderTime = new Date(today.getTime() + i * 30 * 60 * 1000);
        const numItems = Math.floor(Math.random() * 3) + 1;
        const selectedProducts = [];

        for (let j = 0; j < numItems; j++) {
            const randomProduct = products[Math.floor(Math.random() * products.length)];
            selectedProducts.push({
                product: randomProduct,
                quantity: Math.floor(Math.random() * 2) + 1,
            });
        }

        let subtotal = 0;
        let taxAmount = 0;
        const items = selectedProducts.map(sp => {
            const itemSubtotal = sp.product.basePrice * sp.quantity;
            const itemTax = (itemSubtotal * sp.product.taxPercent) / 100;
            subtotal += itemSubtotal;
            taxAmount += itemTax;
            return {
                productId: sp.product.id,
                productName: sp.product.name,
                quantity: sp.quantity,
                unitPrice: sp.product.basePrice,
                taxAmount: itemTax,
                subtotal: itemSubtotal,
                isPrepared: i <= 2,
            };
        });

        const totalAmount = subtotal + taxAmount;
        const kitchenStatus = i <= 2 ? 'COMPLETED' : (i === 3 ? 'PREPARING' : 'TO_COOK');
        const status = i <= 2 ? 'PAID' : 'CONFIRMED';
        const tableId = tables[i - 1].id;

        const order = await prisma.order.create({
            data: {
                orderNumber: `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(i).padStart(4, '0')}`,
                shopId: shop.id,
                sessionId: openSession.id,
                tableId,
                status,
                kitchenStatus,
                subtotal,
                taxAmount,
                totalAmount,
                createdAt: orderTime,
                items: {
                    create: items,
                },
            },
        });

        if (status === 'PAID') {
            await prisma.payment.create({
                data: {
                    orderId: order.id,
                    method: 'CASH',
                    amount: totalAmount,
                    status: 'COMPLETED',
                    createdAt: orderTime,
                },
            });
        }
    }
    console.log('✅ Created 5 orders for today session');

    // Update session stats
    const todayStats = await prisma.order.aggregate({
        where: { sessionId: openSession.id, status: 'PAID' },
        _sum: { totalAmount: true },
        _count: true,
    });

    await prisma.session.update({
        where: { id: openSession.id },
        data: {
            totalRevenue: todayStats._sum.totalAmount || 0,
            totalOrders: todayStats._count,
        },
    });

    // Update customer total sales
    for (const customer of customers) {
        const customerSales = await prisma.order.aggregate({
            where: { customerId: customer.id, status: 'PAID' },
            _sum: { totalAmount: true },
        });

        await prisma.customer.update({
            where: { id: customer.id },
            data: { totalSales: customerSales._sum.totalAmount || 0 },
        });
    }
    console.log('✅ Updated customer sales totals');

    // Update shop last revenue
    await prisma.shop.update({
        where: { id: shop.id },
        data: {
            lastOpenTime: today,
            lastRevenue: closedSession.totalRevenue,
        },
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('🎉 Comprehensive seed completed successfully!');
    console.log('');
    console.log('📧 Admin login: admin@caffeeos.com / admin123');
    console.log('📧 Staff login: staff@caffeeos.com / admin123');
    console.log('');
    console.log('📊 Data created:');
    console.log('   • 2 users (admin + staff)');
    console.log('   • 1 shop');
    console.log('   • 3 floors, 17 tables');
    console.log('   • 8 categories, 45 products');
    console.log('   • 8 product variants');
    console.log('   • 10 customers');
    console.log('   • 2 sessions (1 closed, 1 open)');
    console.log('   • 30 orders with items and payments');
    console.log('═══════════════════════════════════════════════════');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
