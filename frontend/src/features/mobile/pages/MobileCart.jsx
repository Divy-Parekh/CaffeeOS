import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui';

const MobileCart = ({ cart, onUpdateQuantity, onConfirm, isLoading, themeColor }) => {
    const navigate = useNavigate();
    const { tableToken } = useParams();
    const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Trash2 className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Cart is empty</h2>
                <p className="text-muted-foreground mb-8">Add some delicious items to your cart</p>
                <Button
                    onClick={() => navigate(`/m/${tableToken}/menu`)}
                    style={{ backgroundColor: themeColor }}
                    size="lg"
                >
                    Browse Menu
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-4 z-20">
                <button
                    onClick={() => navigate(`/m/${tableToken}/menu`)}
                    className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Your Order</h1>
                <span className="ml-auto bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-bold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
            </div>

            {/* Cart Items */}
            <div className="p-4 space-y-4">
                {cart.map((item) => (
                    <motion.div
                        layout
                        key={item.productId}
                        className="flex gap-4 p-4 bg-card rounded-2xl shadow-sm border border-border"
                    >
                        <div className="w-20 h-20 bg-muted rounded-xl flex-shrink-0 overflow-hidden">
                            {item.image ? (
                                <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-xl">
                                    {item.productName.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-foreground leading-tight pr-2">{item.productName}</h4>
                                <p className="font-bold whitespace-nowrap" style={{ color: themeColor }}>
                                    {formatCurrency(item.unitPrice * item.quantity)}
                                </p>
                            </div>

                            <div className="flex items-center justify-between mt-2">
                                <div className="text-xs text-muted-foreground font-medium">
                                    {formatCurrency(item.unitPrice)} / item
                                </div>

                                <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
                                    <button
                                        onClick={() => onUpdateQuantity(item.productId, -1)}
                                        className="w-7 h-7 bg-card rounded-md shadow-sm flex items-center justify-center text-muted-foreground active:scale-95 transition-transform"
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-4 text-center font-bold text-sm text-foreground">{item.quantity}</span>
                                    <button
                                        onClick={() => onUpdateQuantity(item.productId, 1)}
                                        className="w-7 h-7 text-white rounded-md shadow-sm flex items-center justify-center active:scale-95 transition-transform"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bill Details */}
            <div className="px-4 mt-4">
                <div className="bg-card p-5 rounded-2xl border border-border space-y-3">
                    <h3 className="font-bold text-foreground text-sm mb-2">Payment Summary</h3>

                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Taxes & Fees</span>
                        <span>Included</span>
                    </div>

                    <div className="border-t border-dashed border-border my-2 pt-2 flex justify-between items-center">
                        <span className="font-bold text-foreground">Total pay</span>
                        <span className="font-bold text-xl" style={{ color: themeColor }}>
                            {formatCurrency(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-8 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <Button
                    fullWidth
                    size="xl"
                    className="h-14 text-lg rounded-xl shadow-lg shadow-primary/20 text-white"
                    onClick={onConfirm}
                    isLoading={isLoading}
                    style={{ backgroundColor: themeColor }}
                >
                    Checkout
                </Button>
            </div>
        </div>
    );
};

export default MobileCart;
