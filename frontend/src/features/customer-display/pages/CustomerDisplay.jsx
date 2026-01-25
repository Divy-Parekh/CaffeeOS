import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { ShoppingCart, Check } from 'lucide-react';
import { getSocket, connectSocket, SOCKET_EVENTS } from '../../../services/socket';

const CustomerDisplay = () => {
    const { shopId } = useParams();
    const [state, setState] = useState({
        mode: 'welcome',
        items: [],
        total: 0,
    });

    useEffect(() => {
        if (shopId) {
            const socket = connectSocket(shopId);

            socket.on(SOCKET_EVENTS.CUSTOMER_DISPLAY_UPDATE, (data) => {
                setState((prev) => ({ ...prev, ...data }));
            });

            socket.on(SOCKET_EVENTS.CART_UPDATE, (data) => {
                setState((prev) => ({
                    ...prev,
                    mode: 'cart',
                    items: data.items,
                    total: data.total,
                }));
            });

            socket.on(SOCKET_EVENTS.PAYMENT_PENDING, (data) => {
                setState((prev) => ({
                    ...prev,
                    mode: 'payment',
                    upiQr: data.upiQr,
                    total: data.total,
                }));
            });

            socket.on(SOCKET_EVENTS.PAYMENT_SUCCESS, () => {
                setState((prev) => ({ ...prev, mode: 'thankyou' }));
                setTimeout(() => {
                    setState({ mode: 'welcome', items: [], total: 0 });
                }, 5000);
            });

            return () => {
                socket.off(SOCKET_EVENTS.CUSTOMER_DISPLAY_UPDATE);
                socket.off(SOCKET_EVENTS.CART_UPDATE);
                socket.off(SOCKET_EVENTS.PAYMENT_PENDING);
                socket.off(SOCKET_EVENTS.PAYMENT_SUCCESS);
            };
        }
    }, [shopId]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Panel - Fixed Welcome */}
            <div className="w-1/2 bg-gradient-to-br from-primary/30 to-background flex flex-col items-center justify-center p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <h1 className="text-5xl font-bold text-foreground mb-4">
                        <span className="text-primary">Caffee</span>OS
                    </h1>
                    <p className="text-2xl text-muted-foreground">Welcome!</p>
                    <p className="text-xl text-muted-foreground/80 mt-4">Your order is being prepared</p>
                </motion.div>
            </div>

            {/* Right Panel - Dynamic */}
            <div className="w-1/2 flex flex-col">
                <AnimatePresence mode="wait">
                    {state.mode === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center justify-center"
                        >
                            <div className="text-center text-gray-500">
                                <ShoppingCart className="w-24 h-24 mx-auto mb-4 opacity-20" />
                                <p className="text-xl">Waiting for order...</p>
                            </div>
                        </motion.div>
                    )}

                    {state.mode === 'cart' && (
                        <motion.div
                            key="cart"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex-1 flex flex-col p-8"
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-6">Your Order</h2>

                            <div className="flex-1 overflow-auto space-y-4">
                                {state.items.map((item, idx) => (
                                    <motion.div
                                        key={item.productId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
                                    >
                                        <div className="flex items-center gap-4">
                                            {item.image ? (
                                                <img src={item.image} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                                    <span className="text-2xl text-muted-foreground">{item.productName.charAt(0)}</span>
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-medium text-foreground text-lg">{item.productName}</h3>
                                                <p className="text-muted-foreground">{formatCurrency(item.unitPrice)} x {item.quantity}</p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold text-foreground">
                                            {formatCurrency(item.unitPrice * item.quantity)}
                                        </span>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="border-t border-border pt-6 mt-6">
                                <div className="flex justify-between text-3xl font-bold text-foreground">
                                    <span>Total</span>
                                    <span className="text-primary">{formatCurrency(state.total)}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {state.mode === 'payment' && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex-1 flex flex-col items-center justify-center p-8"
                        >
                            <h2 className="text-2xl font-bold text-foreground mb-6">Scan to Pay</h2>

                            <div className="bg-white p-6 rounded-2xl mb-6 shadow-sm border border-border">
                                <QRCode value={state.upiQr || ''} size={250} />
                            </div>

                            <p className="text-4xl font-bold text-primary mb-4">{formatCurrency(state.total)}</p>
                            <p className="text-xl text-muted-foreground">Waiting for payment...</p>
                        </motion.div>
                    )}

                    {state.mode === 'thankyou' && (
                        <motion.div
                            key="thankyou"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex-1 flex flex-col items-center justify-center p-8"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.2 }}
                                className="w-24 h-24 bg-success rounded-full flex items-center justify-center mb-6"
                            >
                                <Check className="w-12 h-12 text-white" />
                            </motion.div>

                            <h2 className="text-4xl font-bold text-foreground mb-4">Thank You!</h2>
                            <p className="text-xl text-muted-foreground">Payment received successfully</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CustomerDisplay;
