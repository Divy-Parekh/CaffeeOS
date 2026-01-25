import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { queryClient } from './services/queryClient';
import { LoadingOverlay } from './components/ui';

// Layouts
import { AuthLayout, DashboardLayout, POSLayout } from './layouts';

// Auth Pages
import Login from './features/auth/pages/Login';
import Signup from './features/auth/pages/Signup';
import VerifyOTP from './features/auth/pages/VerifyOTP';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';

// Dashboard Pages
import Dashboard from './features/dashboard/pages/Dashboard';

// Orders Pages
import OrderList from './features/orders/pages/OrderList';
import OrderDetail from './features/orders/pages/OrderDetail';
import PaymentList from './features/orders/pages/PaymentList';
import CustomerList from './features/orders/pages/CustomerList';

// Products Pages
import ProductList from './features/products/pages/ProductList';
import ProductForm from './features/products/pages/ProductForm';
import CategoryList from './features/products/pages/CategoryList';

// POS Pages
import TableView from './features/pos/pages/TableView';
import RegisterView from './features/pos/pages/RegisterView';
import OrdersView from './features/pos/pages/OrdersView';

// Kitchen & Customer Display
import KitchenDisplay from './features/kitchen/pages/KitchenDisplay';
import CustomerDisplay from './features/customer-display/pages/CustomerDisplay';

// Settings
import ShopSettings from './features/settings/pages/ShopSettings';

// Reporting
// Reporting
import ReportDashboard from './features/reporting/pages/ReportDashboard';

// Development
import DevelopmentView from './features/development/pages/DevelopmentView';


// Mobile Ordering
import MobileOrder from './features/mobile/pages/MobileOrder';
import TableSelection from './features/mobile/pages/TableSelection';

// Protected Route Wrapper
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <Provider store={store}>
            <PersistGate loading={<LoadingOverlay message="Loading..." />} persistor={persistor}>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter>
                        <Routes>
                            {/* Auth Routes */}
                            <Route element={<AuthLayout />}>
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
                                <Route path="/verify-otp" element={<VerifyOTP />} />
                                <Route path="/forgot-password" element={<ForgotPassword />} />
                                <Route path="/reset-password" element={<ResetPassword />} />
                            </Route>

                            {/* Dashboard Routes (Protected) */}
                            <Route element={<ProtectedRoute requiredRole="ADMIN"><DashboardLayout /></ProtectedRoute>}>
                                <Route path="/" element={<Dashboard />} />

                                {/* Orders */}
                                <Route path="/orders" element={<OrderList />} />
                                <Route path="/orders/:id" element={<OrderDetail />} />
                                <Route path="/orders/payments" element={<PaymentList />} />
                                <Route path="/orders/customers" element={<CustomerList />} />

                                {/* Products */}
                                <Route path="/products" element={<ProductList />} />
                                <Route path="/products/new" element={<ProductForm />} />
                                <Route path="/products/:id" element={<ProductForm />} />
                                <Route path="/products/categories" element={<CategoryList />} />

                                {/* Settings */}
                                <Route path="/settings/:shopId" element={<ShopSettings />} />

                                {/* Reporting */}
                                <Route path="/reporting" element={<ReportDashboard />} />
                            </Route>

                            {/* POS Terminal Routes (Protected) */}
                            <Route element={<ProtectedRoute requiredRole="ADMIN"><POSLayout /></ProtectedRoute>}>
                                <Route path="/pos/:shopId/:sessionId" element={<Navigate to="register" replace />} />
                                <Route path="/pos/:shopId/:sessionId/table" element={<TableView />} />
                                <Route path="/pos/:shopId/:sessionId/register" element={<RegisterView />} />
                                <Route path="/pos/:shopId/:sessionId/orders" element={<OrdersView />} />
                            </Route>

                            {/* Kitchen Display (Protected) */}
                            <Route path="/kitchen/:shopId" element={<ProtectedRoute><KitchenDisplay /></ProtectedRoute>} />

                            {/* Customer Display (Public but shop-specific) */}
                            <Route path="/customer-display/:shopId" element={<CustomerDisplay />} />

                            {/* Mobile Ordering (Public - QR code access) */}
                            <Route path="/m/s/:shopId" element={<TableSelection />} />
                            <Route path="/m/:tableToken/*" element={<MobileOrder />} />

                            {/* Development Route (Public for testing) */}
                            <Route path="/development" element={<DevelopmentView />} />

                            {/* Fallback */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </QueryClientProvider>
            </PersistGate>
        </Provider>
    );
}

export default App;
