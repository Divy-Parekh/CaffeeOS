const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                process.env.FRONTEND_URL || 'http://localhost:5173',
                process.env.NGROK_URL || 'http://localhost:3000',
            ],
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Join shop-specific rooms
        socket.on('join_shop', (shopId) => {
            socket.join(`shop_${shopId}`);
            socket.join(`kitchen_${shopId}`);
            socket.join(`customer_display_${shopId}`);
            console.log(`📍 Socket ${socket.id} joined shop: ${shopId}`);
        });

        // Join order tracking room (for mobile customers)
        socket.on('join_order', (orderId) => {
            socket.join(`order_${orderId}`);
            console.log(`📍 Socket ${socket.id} joined order: ${orderId}`);
        });

        // Leave order room
        socket.on('leave_order', (orderId) => {
            socket.leave(`order_${orderId}`);
        });

        // Leave shop rooms
        socket.on('leave_shop', (shopId) => {
            socket.leave(`shop_${shopId}`);
            socket.leave(`kitchen_${shopId}`);
            socket.leave(`customer_display_${shopId}`);
        });

        // Update customer display cart
        socket.on('update_cart_display', (data) => {
            io.to(`customer_display_${data.shopId}`).emit('refresh_display', {
                cartItems: data.cartItems,
                total: data.total,
                message: data.message || '',
            });
        });

        // Kitchen ticket updates
        socket.on('kitchen_update', (data) => {
            io.to(`shop_${data.shopId}`).emit('order_status_change', data);
            if (data.orderId) {
                io.to(`order_${data.orderId}`).emit('order_status_change', data);
            }
        });

        // Handle new ticket from POS
        socket.on('new_ticket', (data) => {
            // Broadcast to kitchen and other shop devices
            io.to(`kitchen_${data.shopId}`).emit('new_ticket', data);
            io.to(`shop_${data.shopId}`).emit('new_ticket', data);
        });

        // Handle payment success
        socket.on('payment_success', (data) => {
            io.to(`shop_${data.shopId}`).emit('payment_success', data);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Emit to kitchen
const emitToKitchen = (shopId, event, data) => {
    if (io) {
        io.to(`kitchen_${shopId}`).emit(event, data);
    }
};

// Emit to shop
const emitToShop = (shopId, event, data) => {
    if (io) {
        io.to(`shop_${shopId}`).emit(event, data);
    }
};

// Emit to specific order (mobile customer)
const emitToOrder = (orderId, event, data) => {
    if (io) {
        io.to(`order_${orderId}`).emit(event, data);
    }
};

// Emit to customer display
const emitToCustomerDisplay = (shopId, event, data) => {
    if (io) {
        io.to(`customer_display_${shopId}`).emit(event, data);
    }
};

module.exports = {
    initSocket,
    getIO,
    emitToKitchen,
    emitToShop,
    emitToOrder,
    emitToCustomerDisplay,
};
