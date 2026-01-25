import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    IndianRupee, Banknote, CreditCard, Smartphone, X, Check,
    Mail, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Button, Input, Modal } from '../../../components/ui';
import { paymentApi, orderApi } from '../../../services/api';
import { useAppSelector } from '../../../hooks/useRedux';
import { getSocket, SOCKET_EVENTS } from '../../../services/socket';
import { customerApi } from '../../../services/api';

const PaymentModal = ({
    isOpen,
    onClose,
    total,
    shopId,
    sessionId,
    onSuccess,
}) => {
    const cart = useAppSelector((state) => state.cart);
    const queryClient = useQueryClient();

    const [payments, setPayments] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [currentAmount, setCurrentAmount] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successAmount, setSuccessAmount] = useState(0);
    const [email, setEmail] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [waitingForUPI, setWaitingForUPI] = useState(false);

    // Initialize email from cart if available
    React.useEffect(() => {
        if (cart.customerEmail) {
            setEmail(cart.customerEmail);
        }
    }, [cart.customerEmail]);

    // Fetch UPI QR
    const { data: upiQR, isLoading: isQRLoading } = useQuery({
        queryKey: ['upi-qr', shopId, total],
        queryFn: async () => {
            const response = await paymentApi.getUpiQr(shopId, total - getTotalPaid());
            return response.data.data;
        },
        enabled: showQR && selectedMethod === 'UPI',
    });

    // Create order and validate payment
    const validatePaymentMutation = useMutation({
        mutationFn: async () => {
            // Mocking success without backend calls as requested
            return Promise.resolve({ data: { success: true } });

            // Backend calls commented out for frontend-only validation mode
            /*
            // First create the order if not exists
            const orderData = {
                shopId,
                sessionId,
                tableId: cart.tableId,
                customerId: cart.customerId,
                notes: cart.notes,
                discount: cart.discount || 0,
                // Pass tip if backend supports it. We added it to controller.
                tip: cart.tip || 0,
                items: cart.items.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    variantInfo: item.variants,
                })),
            };

            let activeOrderId = orderId;

            // Create or Update order
            if (activeOrderId) {
                await orderApi.update(activeOrderId, orderData);
            } else {
                const orderResponse = await orderApi.create(orderData);
                activeOrderId = orderResponse.data.data.id;
            }

            // Validate payment
            return paymentApi.validate({
                orderId: activeOrderId,
                payments: payments,
            });
            */
        },
        onSuccess: () => {
            setSuccessAmount(getTotalPaid());
            setShowSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
        },
        onError: (error) => {
            console.error("Payment validation failed:", error);
            const message = error.response?.data?.message || 'Payment validation failed';
            alert(message);
        },
    });

    const paymentMethods = [
        { method: 'CASH', label: 'Cash', icon: Banknote },
        { method: 'UPI', label: 'UPI', icon: Smartphone },
        { method: 'CARD', label: 'Card', icon: CreditCard },
    ];

    const getTotalPaid = () => payments.reduce((sum, p) => sum + p.amount, 0);
    const getRemaining = () => total - getTotalPaid();

    const handleMethodSelect = (method) => {
        setSelectedMethod(method);
        setCurrentAmount(getRemaining().toString());
        if (method === 'UPI') {
            setShowQR(true);
        }
    };

    const handleAddPayment = () => {
        if (!selectedMethod || !currentAmount) return;

        const amount = parseFloat(currentAmount);
        if (isNaN(amount) || amount <= 0) return;

        const existingIndex = payments.findIndex((p) => p.method === selectedMethod);
        if (existingIndex >= 0) {
            const newPayments = [...payments];
            newPayments[existingIndex].amount += amount;
            setPayments(newPayments);
        } else {
            setPayments([...payments, { method: selectedMethod, amount }]);
        }

        setCurrentAmount('');
        setSelectedMethod(null);
        setShowQR(false);
    };

    const handleRemovePayment = (method) => {
        setPayments(payments.filter((p) => p.method !== method));
    };

    const handleUPIConfirm = () => {
        handleAddPayment();
        setWaitingForUPI(false);
    };

    const handleValidate = () => {
        if (Math.abs(getTotalPaid() - total) > 0.01) return;
        validatePaymentMutation.mutate();
    };

    const handleComplete = () => {
        setShowSuccess(false);
        setPayments([]);
        onSuccess();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Listen for UPI payment success
    React.useEffect(() => {
        if (waitingForUPI) {
            const socket = getSocket();
            socket.on(SOCKET_EVENTS.PAYMENT_SUCCESS, () => {
                handleUPIConfirm();
            });

            return () => {
                socket.off(SOCKET_EVENTS.PAYMENT_SUCCESS);
            };
        }
    }, [waitingForUPI]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Payment"
            size="lg"
            showCloseButton={!showSuccess}
        >
            <AnimatePresence mode="wait">
                {showSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                    >
                        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-3xl font-bold text-foreground mb-2">Amount Paid</h3>
                        <p className="text-4xl font-bold text-success mb-8">{formatCurrency(successAmount)}</p>

                        {/* Email / Customer Section */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                            {isEmailSent ? (
                                <div className="text-success flex items-center justify-center gap-2">
                                    <Check className="w-5 h-5" />
                                    <span>Receipt sent successfully!</span>
                                </div>
                            ) : cart.customerId ? (
                                // Existing Customer Case
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Send receipt to <strong>{cart.customerName}</strong>
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Update email if needed"
                                            className="bg-background"
                                        />
                                        <Button
                                            variant="accent"
                                            onClick={() => {
                                                // Mock send email
                                                setIsEmailSent(true);
                                                // In real app: orderApi.sendReceipt(orderId, email)
                                            }}
                                            disabled={!email}
                                        >
                                            Send
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // New Customer / Guest Case
                                <div className="space-y-3">
                                    <p className="text-sm text-foreground font-medium text-left">
                                        Add customer & send receipt
                                    </p>
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Customer Name"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="bg-background"
                                        />
                                        <div className="flex gap-2">
                                            <Input
                                                type="email"
                                                placeholder="Email Address"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="bg-background"
                                            />
                                            <Button
                                                variant="primary"
                                                onClick={async () => {
                                                    try {
                                                        if (customerName && email) {
                                                            // Create customer
                                                            await customerApi.create({
                                                                name: customerName,
                                                                email: email,
                                                                shopId
                                                            });
                                                        }
                                                        setIsEmailSent(true);
                                                    } catch (err) {
                                                        console.error("Failed to add customer", err);
                                                        // Still mark as sent for demo flow or show error
                                                        setIsEmailSent(true);
                                                    }
                                                }}
                                                disabled={!email}
                                            >
                                                Send
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6">
                            <Button variant="ghost" fullWidth onClick={handleComplete}>
                                Close & New Order
                            </Button>
                        </div>
                    </motion.div>
                ) : showQR && selectedMethod === 'UPI' ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-4"
                    >
                        <h3 className="text-xl font-semibold mb-4">UPI QR</h3>

                        <div className="bg-white p-4 rounded-xl inline-block mb-4">
                            {isQRLoading || !upiQR ? (
                                <div className="w-[256px] h-[256px] flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-dark-500 animate-spin" />
                                </div>
                            ) : (
                                <QRCode
                                    value={upiQR.qrData}
                                    size={256}
                                />
                            )}
                        </div>

                        <p className="text-2xl font-bold text-foreground mb-2">
                            {isQRLoading ? 'Generating QR...' : `Amount: ${formatCurrency(parseFloat(currentAmount) || getRemaining())}`}
                        </p>

                        {waitingForUPI ? (
                            <div className="flex items-center justify-center gap-2 text-warning">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Waiting for payment...</span>
                            </div>
                        ) : (
                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={() => { setShowQR(false); setSelectedMethod(null); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    fullWidth
                                    onClick={handleUPIConfirm}
                                >
                                    Confirmed
                                </Button>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {/* Total Display */}
                        <div className="text-center py-6 border-b border-dark-600 mb-6">
                            <p className="text-muted-foreground mb-1">Total Due</p>
                            <p className="text-4xl font-bold text-foreground">{formatCurrency(total)}</p>
                            {getTotalPaid() > 0 && (
                                <p className="text-lg text-success mt-2">
                                    Remaining: {formatCurrency(getRemaining())}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-6">
                            {/* Payment Methods */}
                            <div className="w-1/3 space-y-2">
                                {paymentMethods.map(({ method, label, icon: Icon }) => (
                                    <button
                                        key={method}
                                        onClick={() => handleMethodSelect(method)}
                                        className={`w-full flex items-center gap-3 p-4 rounded-lg transition-colors ${selectedMethod === method
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Amount Input & Added Payments */}
                            <div className="flex-1 space-y-4">
                                {/* Added Payments */}
                                {payments.map((payment) => (
                                    <div
                                        key={payment.method}
                                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground font-medium">{payment.method}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-success font-semibold">
                                                {formatCurrency(payment.amount)}
                                            </span>
                                            <button
                                                onClick={() => handleRemovePayment(payment.method)}
                                                className="p-1 hover:bg-muted/80 rounded"
                                            >
                                                <X className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Current Amount Input */}
                                {selectedMethod && selectedMethod !== 'UPI' && (
                                    <div className="space-y-3">
                                        <Input
                                            type="number"
                                            label={`${selectedMethod} Amount`}
                                            value={currentAmount}
                                            onChange={(e) => setCurrentAmount(e.target.value)}
                                            leftIcon={<IndianRupee className="w-5 h-5" />}
                                            autoFocus
                                        />
                                        <Button fullWidth onClick={handleAddPayment}>
                                            Add {selectedMethod}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Validate Button */}
                        <div className="mt-6 pt-4 border-t border-border">
                            <Button
                                variant="accent"
                                size="lg"
                                fullWidth
                                onClick={handleValidate}
                                isLoading={validatePaymentMutation.isPending}
                                disabled={Math.abs(getTotalPaid() - total) > 0.01}
                            >
                                Validate
                            </Button>
                            {Math.abs(getTotalPaid() - total) > 0.01 && getTotalPaid() > 0 && (
                                <p className="text-center text-warning text-sm mt-2">
                                    Payment does not match total. Remaining: {formatCurrency(getRemaining())}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Modal>
    );
};

export default PaymentModal;
