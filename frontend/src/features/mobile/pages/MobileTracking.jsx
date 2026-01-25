import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, ChefHat, Bell } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getSocket, SOCKET_EVENTS } from '../../../services/socket';
import { orderApi } from '../../../services/api';
import { useQuery } from '@tanstack/react-query';

const MobileTracking = ({ themeColor }) => {
    const { tableToken, orderId } = useParams();
    const [status, setStatus] = useState('TO_COOK');

    // Fetch initial order status using standard order API
    const { data: order } = useQuery({
        queryKey: ['mobile-order-status', orderId],
        queryFn: async () => {
            const response = await orderApi.getById(orderId);
            return response.data.data;
        },
        enabled: !!orderId,
    });

    // Update status when order data is fetched
    useEffect(() => {
        if (order?.kitchenStatus) {
            setStatus(order.kitchenStatus);
        }
    }, [order]);


    useEffect(() => {
        if (!orderId) return;

        const socket = getSocket();

        // Join the specific order room for updates
        socket.emit('join_order', orderId);

        socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGE, (data) => {
            console.log('Order update received:', data);
            if (data.orderId === orderId) {
                setStatus(data.kitchenStatus);
            }
        });

        return () => {
            socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGE);
            socket.emit('leave_order', orderId);
        };
    }, [orderId]);

    const steps = [
        {
            id: 'TO_COOK',
            label: 'Order Placed',
            description: 'We have received your order',
            icon: Clock
        },
        {
            id: 'PREPARING',
            label: 'Preparing',
            description: 'Chef is cooking your meal',
            icon: ChefHat
        },
        {
            id: 'COMPLETED',
            label: 'Ready to Serve',
            description: 'Your food is ready!',
            icon: Bell
        }
    ];

    const currentStepIndex = steps.findIndex((s) => s.id === status);
    // Handle case where status might be unknown or different
    const activeStep = currentStepIndex === -1 ? 0 : currentStepIndex;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 pb-20">
            <div className="w-full max-w-sm bg-card rounded-[2rem] shadow-xl overflow-hidden border border-border">
                {/* Header Status */}
                <div
                    className="p-8 text-center relative overflow-hidden"
                    style={{ backgroundColor: themeColor }}
                >
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
                            {status === 'COMPLETED' ? (
                                <Bell className="w-10 h-10 text-white animate-bounce" />
                            ) : status === 'PREPARING' ? (
                                <ChefHat className="w-10 h-10 text-white animate-pulse" />
                            ) : (
                                <Clock className="w-10 h-10 text-white" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {status === 'COMPLETED' ? 'Order Ready!' :
                                status === 'PREPARING' ? 'Cooking...' : 'Order Placed'}
                        </h1>
                        <p className="text-white/80 text-sm">Order #{order?.orderNumber}</p>
                    </div>
                </div>

                {/* Timeline */}
                <div className="p-8 py-10">
                    <div className="relative space-y-8 pl-4">
                        {/* Connecting Line */}
                        <div
                            className="absolute left-[27px] top-4 bottom-8 w-0.5 bg-muted"
                            style={{
                                height: 'calc(100% - 32px)',
                                zIndex: 0
                            }}
                        >
                            <motion.div
                                className="w-full bg-primary origin-top"
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: (activeStep / (steps.length - 1)) }}
                                transition={{ duration: 0.5 }}
                                style={{
                                    backgroundColor: themeColor,
                                    height: '100%'
                                }}
                            />
                        </div>

                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isCompleted = idx <= activeStep;
                            const isActive = idx === activeStep;

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative z-10 flex items-start gap-4"
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] transition-colors duration-500 flex-shrink-0 ${isCompleted ? 'bg-background border-primary' : 'bg-background border-muted'
                                            }`}
                                        style={isCompleted ? { borderColor: themeColor } : {}}
                                    >
                                        {isCompleted ? (
                                            isActive ? (
                                                <Icon className="w-5 h-5" style={{ color: themeColor }} />
                                            ) : (
                                                <Check className="w-5 h-5" style={{ color: themeColor }} />
                                            )
                                        ) : (
                                            <span className="text-muted-foreground text-sm font-bold">{idx + 1}</span>
                                        )}
                                    </div>
                                    <div className={`pt-1 transition-opacity duration-300 ${isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                                        <h3 className="font-bold text-foreground leading-none mb-1">{step.label}</h3>
                                        <p className="text-xs text-muted-foreground font-medium">{step.description}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {status === 'COMPLETED' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-green-50 p-4 text-center border-t border-green-100"
                    >
                        <p className="text-green-700 font-medium text-sm">Please collect your order from counter</p>
                    </motion.div>
                )}
            </div>

            <div className="mt-8 text-center space-y-4">
                <button
                    onClick={() => window.location.reload()}
                    className="text-gray-500 text-sm hover:text-gray-400 underline"
                >
                    Refresh Status
                </button>
            </div>
        </div>
    );
};

export default MobileTracking;
