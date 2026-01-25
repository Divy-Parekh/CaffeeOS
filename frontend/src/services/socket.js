import { io } from 'socket.io-client';

// Socket.io singleton instance
let socket = null;

// Backend URL for socket connection
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

export const connectSocket = (shopId) => {
    const s = getSocket();

    if (!s.connected) {
        s.connect();
    }

    if (shopId) {
        s.emit('join_shop', shopId);
    }

    return s;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
    }
};

// Socket Events
export const SOCKET_EVENTS = {
    // Join rooms
    JOIN_SHOP: 'join_shop',
    LEAVE_SHOP: 'leave_shop',

    // Kitchen events
    NEW_TICKET: 'new_ticket',
    ORDER_STATUS_CHANGE: 'order_status_change',
    ITEM_PREPARED: 'item_prepared',

    // Payment events
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_PENDING: 'payment_pending',

    // Cart/Display events
    CART_UPDATE: 'cart_update',
    CUSTOMER_DISPLAY_UPDATE: 'customer_display_update',

    // Mobile ordering
    MOBILE_ORDER: 'mobile_order',
    ORDER_TRACKING: 'order_tracking',
};

export default socket;
