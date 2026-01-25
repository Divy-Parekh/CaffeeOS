import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, User, Printer } from 'lucide-react';
import { Button, Badge, LoadingCard, Tabs, Card } from '../../../components/ui';
import { orderApi } from '../../../services/api';

const OrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = React.useState('products');
    const [isPrinting, setIsPrinting] = React.useState(false);

    const handlePrint = async () => {
        try {
            setIsPrinting(true);
            const response = await orderApi.getReceipt(id);
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to print order:', error);
            // You might want to show a toast here
        } finally {
            setIsPrinting(false);
        }
    };

    const { data: order, isLoading } = useQuery({
        queryKey: ['order', id],
        queryFn: async () => {
            const response = await orderApi.getById(id);
            return response.data.data;
        },
        enabled: !!id,
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID':
                return <Badge variant="success">Paid</Badge>;
            case 'CONFIRMED':
                return <Badge variant="warning">Confirmed</Badge>;
            case 'DRAFT':
                return <Badge variant="default">Draft</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return <LoadingCard message="Loading order..." />;
    }

    if (!order) {
        return <div className="text-center py-12 text-gray-500">Order not found</div>;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/orders')}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-foreground">Order #{order.orderNumber}</h1>
                            {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(order.createdAt)}
                            </span>
                            {order.customer && (
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {order.customer.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Button
                    leftIcon={<Printer className="w-5 h-5" />}
                    variant="secondary"
                    onClick={handlePrint}
                    isLoading={isPrinting}
                >
                    Print
                </Button>
            </div>

            {/* Order Info Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                    <p className="text-muted-foreground text-sm mb-1">Session</p>
                    <p className="text-foreground font-medium">{order.sessionId.slice(0, 12)}...</p>
                </Card>
                <Card>
                    <p className="text-muted-foreground text-sm mb-1">Table</p>
                    <p className="text-foreground font-medium">{order.table?.name || 'No table'}</p>
                </Card>
                <Card>
                    <p className="text-muted-foreground text-sm mb-1">Customer</p>
                    <p className="text-foreground font-medium">{order.customer?.name || 'Walk-in'}</p>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs
                tabs={[
                    { id: 'products', label: 'Products' },
                    { id: 'info', label: 'Extra Info' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
            />

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'products' && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Qty</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Unit Price</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Tax</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-4 font-medium text-foreground">{item.productName}</td>
                                        <td className="px-4 py-4 text-right text-muted-foreground">{item.quantity}</td>
                                        <td className="px-4 py-4 text-right text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                                        <td className="px-4 py-4 text-right text-muted-foreground">{formatCurrency(item.taxAmount)}</td>
                                        <td className="px-4 py-4 text-right font-semibold text-foreground">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-muted">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right font-medium text-muted-foreground">Subtotal</td>
                                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(order.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right font-medium text-muted-foreground">Tax</td>
                                    <td className="px-4 py-3 text-right text-foreground">{formatCurrency(order.taxAmount)}</td>
                                </tr>
                                {order.discount > 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-right font-medium text-success">Discount</td>
                                        <td className="px-4 py-3 text-right text-success">-{formatCurrency(order.discount)}</td>
                                    </tr>
                                )}
                                <tr className="border-t-2 border-border">
                                    <td colSpan={4} className="px-4 py-4 text-right text-lg font-bold text-foreground">Total</td>
                                    <td className="px-4 py-4 text-right text-lg font-bold text-foreground">{formatCurrency(order.totalAmount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {activeTab === 'info' && (
                    <Card>
                        <div className="space-y-4">
                            <div>
                                <p className="text-muted-foreground text-sm mb-1">Notes</p>
                                <p className="text-foreground">{order.notes || 'No notes'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-sm mb-1">Mobile Order</p>
                                <p className="text-foreground">{order.isMobile ? 'Yes' : 'No'}</p>
                            </div>
                            {order.payments && order.payments.length > 0 && (
                                <div>
                                    <p className="text-muted-foreground text-sm mb-2">Payments</p>
                                    <div className="space-y-2">
                                        {order.payments.map((payment) => (
                                            <div key={payment.id} className="flex justify-between p-3 bg-muted rounded-lg">
                                                <span className="text-foreground">{payment.method}</span>
                                                <span className="font-semibold text-foreground">{formatCurrency(payment.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OrderDetail;
