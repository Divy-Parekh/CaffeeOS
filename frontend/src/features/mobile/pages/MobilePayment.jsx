import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Banknote, CreditCard, Smartphone, Check, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { paymentApi } from '../../../services/api';
import QRCode from 'react-qr-code';

const MobilePayment = ({ cart, shop, onConfirm, isLoading }) => {
    const navigate = useNavigate();
    const { tableToken } = useParams();

    if (!shop) return null;

    const [selectedMethod, setSelectedMethod] = useState(null);
    const [payments, setPayments] = useState([]);
    const [showQR, setShowQR] = useState(false);

    // Calculate total from cart
    const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const themeColor = shop?.themeColor || '#4F46E5';

    const paymentMethods = [
        { method: 'CASH', label: 'Pay at Counter', icon: Banknote, description: 'Pay to the cashier' },
        { method: 'UPI', label: 'UPI / QR', icon: Smartphone, description: 'GPay, PhonePe, Paytm' },
        { method: 'CARD', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard' },
    ];

    // Filter methods based on shop settings
    const availableMethods = paymentMethods.filter(m => {
        if (shop?.paymentMode === 'PAY_AT_COUNTER') return m.method === 'CASH';
        if (shop?.paymentMode === 'PAY_ONLINE') return m.method !== 'CASH';
        return true;
    });

    const getTotalPaid = () => payments.reduce((sum, p) => sum + p.amount, 0);

    // Fetch UPI QR
    const { data: upiQR, isLoading: isQRLoading } = useQuery({
        queryKey: ['mobile-upi-qr', shop?.id, total],
        queryFn: async () => {
            const response = await paymentApi.getUpiQr(shop.id, total);
            return response.data.data;
        },
        enabled: showQR && selectedMethod === 'UPI',
    });

    const handleMethodSelect = (method) => {
        if (method === 'UPI') {
            setShowQR(true);
            setSelectedMethod('UPI');
        } else if (method === 'CASH') {
            // For cash, we just confirm "Pay at Counter" intent
            setPayments([{ method: 'CASH', amount: total }]);
            setSelectedMethod('CASH');
        } else {
            // Card (Simulated for now, or integration needed)
            setPayments([{ method: 'CARD', amount: total }]);
            setSelectedMethod('CARD');
        }
    };

    const handleConfirm = () => {
        // If UPI, we assume they paid if they click Confirm (in real app, use webhook/socket for auto-confirm)
        // Here we pass the payment details to placeOrder
        let finalPayments = payments;

        if (selectedMethod === 'UPI' && payments.length === 0) {
            finalPayments = [{ method: 'UPI', amount: total }];
        }

        onConfirm(finalPayments);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-4 z-20">
                <button
                    onClick={() => navigate(`/m/${tableToken}/cart`)}
                    className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Payment</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Total Card */}
                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border text-center">
                    <p className="text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-4xl font-bold text-foreground">{formatCurrency(total)}</p>
                </div>

                {/* Methods */}
                <div className="space-y-3">
                    <h3 className="font-bold text-foreground">Select Payment Method</h3>
                    {availableMethods.map(({ method, label, icon: Icon, description }) => (
                        <button
                            key={method}
                            onClick={() => handleMethodSelect(method)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${selectedMethod === method
                                ? 'bg-card border-primary shadow-md'
                                : 'bg-card border-transparent hover:border-border'
                                }`}
                            style={selectedMethod === method ? { borderColor: themeColor } : {}}
                        >
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedMethod === method ? 'bg-primary/10' : 'bg-muted'
                                    }`}
                                style={selectedMethod === method ? { backgroundColor: `${themeColor}20` } : {}}
                            >
                                <Icon className="w-6 h-6" style={selectedMethod === method ? { color: themeColor } : { color: '#6B7280' }} />
                            </div>
                            <div>
                                <h4 className="font-bold text-foreground">{label}</h4>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                            {selectedMethod === method && (
                                <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center" style={{ backgroundColor: themeColor }}>
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                {/* UPI QR Display */}
                <AnimatePresence>
                    {showQR && selectedMethod === 'UPI' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white p-6 rounded-2xl shadow-inner border border-gray-100 overflow-hidden"
                        >
                            {isQRLoading || !upiQR ? (
                                <div className="flex flex-col items-center py-8">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">Generating QR...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 mb-4">
                                        <QRCode value={upiQR.qrData} size={200} />
                                    </div>
                                    <p className="font-medium text-foreground mb-4">Scan using any UPI App</p>

                                    <Button
                                        onClick={() => window.open(upiQR.qrData, '_blank')}
                                        fullWidth
                                        variant="outline"
                                    >
                                        Open UPI App
                                    </Button>

                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        After payment, click "Confirm Payment" below
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 pb-8 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <Button
                    fullWidth
                    size="xl"
                    className="h-14 text-lg rounded-xl shadow-lg shadow-primary/20 text-white"
                    onClick={handleConfirm}
                    isLoading={isLoading}
                    disabled={!selectedMethod}
                    style={{ backgroundColor: selectedMethod ? themeColor : undefined }}
                >
                    {selectedMethod === 'CASH' ? 'Place Order' : 'Confirm Payment'}
                </Button>
            </div>
        </div>
    );
};

export default MobilePayment;
