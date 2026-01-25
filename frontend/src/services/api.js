import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            // Clear auth data and redirect to login only if not already logging in
            localStorage.removeItem('token');
            localStorage.removeItem('persist:root');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Auth API
export const authApi = {
    login: (email, password) =>
        api.post('/auth/login', { email, password }),

    signup: (name, email, password) =>
        api.post('/auth/signup', { name, email, password }),

    verifyOtp: (email, otp) =>
        api.post('/auth/verify-otp', { email, otp }),

    forgotPassword: (email) =>
        api.post('/auth/forgot-password', { email }),

    resetPassword: (email, otp, newPassword) =>
        api.post('/auth/reset-password', { email, otp, newPassword }),

    logout: () =>
        api.post('/auth/logout'),

    me: () =>
        api.get('/auth/me'),
};

// Shop API
export const shopApi = {
    getAll: () => api.get('/shops'),
    getById: (id) => api.get(`/shops/${id}`),
    create: (data) => api.post('/shops', data),
    update: (id, data) => api.patch(`/shops/${id}`, data),
    updateSettings: (id, data) => api.patch(`/shops/${id}/settings`, data),
    delete: (id) => api.delete(`/shops/${id}`),
};

// Floor API
export const floorApi = {
    getByShop: (shopId) => api.get(`/shops/${shopId}/floors`),
    create: (shopId, data) => api.post(`/shops/${shopId}/floors`, data),
    update: (id, data) => api.patch(`/floors/${id}`, data),
    delete: (id) => api.delete(`/floors/${id}`),
};

// Table API
export const tableApi = {
    getByFloor: (floorId) => api.get(`/tables/floors/${floorId}/tables`),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.patch(`/tables/${id}`, data),
    bulkUpdate: (data) => api.patch('/tables/bulk', data),
    delete: (id) => api.delete(`/tables/${id}`),
    getQr: (id) => api.get(`/tables/${id}/qr`),
    downloadAllQr: (shopId) => api.get(`/tables/shops/${shopId}/qr-sheet`, { responseType: 'blob' }),
    clear: (id) => api.patch(`/tables/${id}/clear`),
};

// Category API
export const categoryApi = {
    getAll: () => api.get('/categories'),
    getByShop: (shopId) => api.get(`/categories?shopId=${shopId}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.patch(`/categories/${id}`, data),
    resequence: (data) => api.patch('/categories/resequence', data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// Product API
export const productApi = {
    getAll: (params) => api.get('/products', { params }),
    getByShop: (shopId, params) =>
        api.get(`/products?shopId=${shopId}`, { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id, data) => api.patch(`/products/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    delete: (id) => api.delete(`/products/${id}`),

    // Variants
    addVariant: (productId, data) =>
        api.post(`/products/${productId}/variants`, data),
    updateVariant: (productId, variantId, data) =>
        api.patch(`/products/${productId}/variants/${variantId}`, data),
    deleteVariant: (productId, variantId) =>
        api.delete(`/products/${productId}/variants/${variantId}`),
};

// Customer API
export const customerApi = {
    getByShop: (shopId, search) => api.get('/customers', { params: { shopId, search } }),
    getAll: () => api.get('/customers'), // New method for all customers
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.patch(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
    bulkDelete: (ids) => api.post('/customers/bulk-delete', { ids }),
    getOrders: (id, params) => api.get(`/customers/${id}/orders`, { params }),
    getIndianStates: () => api.get('/customers/indian-states'),
};

// Session API
export const sessionApi = {
    getByShop: (shopId) => api.get(`/sessions?shopId=${shopId}`),
    getCurrent: (shopId) => api.get(`/sessions/current?shopId=${shopId}`),
    getPOSData: (shopId) => api.get(`/sessions/pos/data?shopId=${shopId}`),
    start: (data) => api.post('/sessions/start', data),
    close: (id, data) => api.post(`/sessions/${id}/close`, data),
    getById: (id) => api.get(`/sessions/${id}`),
};

// Order API
export const orderApi = {
    getBySession: (sessionId) => api.get(`/orders?sessionId=${sessionId}`),
    getByShop: (shopId, params) =>
        api.get(`/orders?shopId=${shopId}`, { params }),
    getById: (id) => api.get(`/orders/${id}`),
    create: (data) => api.post('/orders', data),
    update: (id, data) => api.patch(`/orders/${id}`, data),
    calculate: (data) => api.post('/orders/calculate', data),
    delete: (id) => api.delete(`/orders/${id}`),
    getReceipt: (id) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' }),
};

// Payment API
export const paymentApi = {
    getByShop: (shopId, params) =>
        api.get(`/payments?shopId=${shopId}`, { params }),
    validate: (data) =>
        api.post('/payments/validate', data),
    getUpiQr: (shopId, amount) =>
        api.get(`/payments/upi-qr?shopId=${shopId}&amount=${amount}`),
};

// Kitchen API
export const kitchenApi = {
    getTickets: (shopId, status) =>
        api.get(`/kitchen/tickets?shopId=${shopId}`, { params: { status } }),
    updateStatus: (orderId, status) =>
        api.patch(`/kitchen/tickets/${orderId}/status`, { status }),
    updateItemStatus: (orderId, itemId, isPrepared) =>
        api.patch(`/kitchen/tickets/${orderId}/items/${itemId}`, { isPrepared }),
};

// Mobile API
export const mobileApi = {
    getShopByToken: (token) => api.get(`/m/${token}`),
    getShopTables: (shopId) => api.get(`/m/s/${shopId}`),
    getMenu: (token) => api.get(`/m/${token}/menu`),
    placeOrder: (token, data) => api.post(`/m/${token}/orders`, data),
    getOrderStatus: (token, orderId) => api.get(`/m/${token}/orders/${orderId}`),
};

// Report API
export const reportApi = {
    getDashboard: (shopId, params) =>
        api.get(`/reports/dashboard?shopId=${shopId}`, { params }),
    exportPdf: (shopId, params) =>
        api.get(`/reports/export?shopId=${shopId}`, { params, responseType: 'blob' }),
};

// ImageKit API
export const imagekitApi = {
    getAuthParams: () => api.get('/imagekit/auth'),
};
