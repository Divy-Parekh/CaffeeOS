const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Clearing all database data...');

    // Delete in order to respect foreign key constraints
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
    // Delete shop last because many things depend on it
    // Usually we might want to keep the main shop or user, but "empty" implies empty.
    // However, if we delete shop, we might break the app flow if it expects a shop.
    // We will delete everything as requested.
    await prisma.shop.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database cleared successfully.');
}

main()
    .catch((e) => {
        console.error('❌ Failed to clear database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
