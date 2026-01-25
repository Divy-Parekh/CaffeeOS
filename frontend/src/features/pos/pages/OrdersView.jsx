import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, User, DollarSign } from 'lucide-react';
import { Badge, LoadingCard } from '../../../components/ui';
import { orderApi } from '../../../services/api';

const OrdersView = () => {
    const { shopId, sessionId } = useParams();
    const navigate = useNavigate();

    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders', sessionId],
        queryFn: async () => {
            const response = await orderApi.getBySession(sessionId);
            return response.data.data;
        },
        enabled: !!sessionId,
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
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
            case 'CANCELLED':
                return <Badge variant="danger">Cancelled</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getKitchenBadge = (status) => {
        switch (status) {
            case 'COMPLETED':
                return <Badge variant="success" size="sm">Ready</Badge>;
            case 'PREPARING':
                return <Badge variant="warning" size="sm">Preparing</Badge>;
            case 'TO_COOK':
                return <Badge variant="default" size="sm">Pending</Badge>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return <LoadingCard message="Loading orders..." />;
    }

    return (
        <div className="h-full flex flex-col p-4">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Session Orders</h2>
                <p className="text-muted-foreground text-sm">{orders?.length || 0} orders in this session</p>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="space-y-3">
                    {orders?.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer shadow-sm"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-lg font-semibold text-foreground">
                                            #{order.orderNumber}
                                        </span>
                                        {getStatusBadge(order.status)}
                                        {getKitchenBadge(order.kitchenStatus)}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {formatTime(order.createdAt)}
                                        </span>
                                        {order.table && (
                                            <span>Table: {order.table.name}</span>
                                        )}
                                        {order.customer && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-4 h-4" />
                                                {order.customer.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-foreground">
                                        {formatCurrency(order.totalAmount)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {order.items.length} items
                                    </p>
                                </div>
                            </div>

                            {/* Order Items Preview */}
                            <div className="flex flex-wrap gap-2">
                                {order.items.slice(0, 5).map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 bg-muted rounded text-sm text-muted-foreground"
                                    >
                                        {item.quantity}x {item.productName}
                                    </span>
                                ))}
                                {order.items.length > 5 && (
                                    <span className="px-2 py-1 bg-muted rounded text-sm text-muted-foreground">
                                        +{order.items.length - 5} more
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {orders?.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No orders yet</h3>
                        <p className="text-muted-foreground">Orders from this session will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersView;
