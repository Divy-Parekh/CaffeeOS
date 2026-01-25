import React, { useState, useEffect } from 'react';
import { useParams, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LoadingCard } from '../../../components/ui';
import { mobileApi } from '../../../services/api';

// Child Pages
import MobileSplash from './MobileSplash';
import MobileMenu from './MobileMenu';
import MobileCart from './MobileCart';
import MobilePayment from './MobilePayment'; // New
import MobileTracking from './MobileTracking';
import { AnimatePresence } from 'framer-motion';

// Main Container & Router
const MobileOrder = () => {
    const { tableToken } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Persistent Cart State (Simple LocalStorage implementation for resilience)
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem(`cart_${tableToken}`);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // Save cart to storage whenever it changes
    useEffect(() => {
        localStorage.setItem(`cart_${tableToken}`, JSON.stringify(cart));
    }, [cart, tableToken]);

    // Fetch shop data
    const { data: shopData, isLoading: isShopLoading } = useQuery({
        queryKey: ['mobile-shop', tableToken],
        queryFn: async () => {
            const response = await mobileApi.getShopByToken(tableToken);
            return response.data.data;
        },
        enabled: !!tableToken,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
    });

    // Fetch menu (only fetch when needed, but cached)
    const { data: menuData, isLoading: isMenuLoading } = useQuery({
        queryKey: ['mobile-menu', tableToken],
        queryFn: async () => {
            const response = await mobileApi.getMenu(tableToken);
            return response.data.data;
        },
        enabled: !!tableToken,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });

    // Place order
    const placeOrderMutation = useMutation({
        mutationFn: async (payments = []) => {
            const response = await mobileApi.placeOrder(tableToken, {
                items: cart.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    toppings: item.toppings || [], // Future proofing
                    variantId: item.variantId,
                })),
                payments: payments, // Send payments
            });
            return response.data.data;
        },
        onSuccess: (data) => {
            setCart([]); // Clear cart
            localStorage.removeItem(`cart_${tableToken}`);
            navigate(`/m/${tableToken}/status/${data.orderId}`, { replace: true });
        },
    });

    // Cart Actions
    const addToCart = (product) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    productName: product.name,
                    unitPrice: product.basePrice,
                    quantity: 1,
                    taxPercent: product.taxPercent,
                    image: product.image,
                },
            ];
        });
    };

    const updateQuantity = (productId, delta) => {
        setCart((prev) => {
            const updated = prev.map((i) =>
                i.productId === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
            );
            return updated.filter((i) => i.quantity > 0);
        });
    };

    if (isShopLoading) {
        return <LoadingCard message="Loading restaurant..." />;
    }

    if (!shopData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <p className="text-gray-500">Invalid QR Code or Restaurant not found.</p>
            </div>
        );
    }

    const themeColor = shopData.shop.themeColor || '#4F46E5';
    const shop = shopData.shop;

    return (
        <div style={{ '--primary-color': themeColor }}>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    {/* Splash Screen (Root) */}
                    <Route
                        index
                        element={
                            <MobileSplash
                                shop={shop}
                                onEnter={() => navigate(`/m/${tableToken}/menu`)}
                            />
                        }
                    />

                    {/* Menu */}
                    <Route
                        path="menu"
                        element={
                            <MobileMenu
                                products={menuData?.products || []}
                                categories={menuData?.categories || []}
                                cart={cart}
                                onAddToCart={addToCart}
                                themeColor={themeColor}
                            />
                        }
                    />

                    {/* Cart */}
                    <Route
                        path="cart"
                        element={
                            <MobileCart
                                cart={cart}
                                onUpdateQuantity={updateQuantity}
                                onConfirm={() => navigate(`/m/${tableToken}/payment`)}
                                isLoading={placeOrderMutation.isPending}
                                themeColor={themeColor}
                            />
                        }
                    />

                    {/* Payment */}
                    <Route
                        path="payment"
                        element={
                            <MobilePayment
                                cart={cart}
                                shop={shop}
                                onConfirm={(payments) => placeOrderMutation.mutate(payments)}
                                isLoading={placeOrderMutation.isPending}
                            />
                        }
                    />

                    {/* Tracking */}
                    <Route
                        path="status/:orderId"
                        element={
                            <MobileTracking
                                themeColor={themeColor}
                            />
                        }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="" replace />} />
                </Routes>
            </AnimatePresence>
        </div>
    );
};

export default MobileOrder;
