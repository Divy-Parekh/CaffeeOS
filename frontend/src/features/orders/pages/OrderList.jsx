import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronRight } from 'lucide-react';
import { Badge, LoadingCard, Input, Tabs, Select } from '../../../components/ui';
import { orderApi, shopApi } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

import { formatCurrency, formatDateTime } from '../../../utils/format';

const OrderList = () => {
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedShop, setSelectedShop] = useState('');

    // Debounce search to prevent focus loss
    const debouncedSearch = useDebounce(searchInput, 300);

    // Fetch all shops for filter
    const { data: shops } = useQuery({
        queryKey: ['shops'],
        queryFn: async () => {
            const response = await shopApi.getAll();
            return response.data.data;
        },
    });

    // Set first shop as default when shops load
    useEffect(() => {
        if (shops?.length > 0 && !selectedShop) {
            setSelectedShop(shops[0].id);
        }
    }, [shops, selectedShop]);

    const { data: orders, isLoading } = useQuery({
        queryKey: ['orders', selectedShop, statusFilter, debouncedSearch],
        queryFn: async () => {
            const params = {
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(debouncedSearch && { search: debouncedSearch })
            };
            const response = await orderApi.getByShop(selectedShop, params);
            return response.data.data;
        },
        enabled: !!selectedShop,
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID':
                return <Badge variant="success" size="sm">Paid</Badge>;
            case 'CONFIRMED':
                return <Badge variant="warning" size="sm">Confirmed</Badge>;
            case 'DRAFT':
                return <Badge variant="default" size="sm">Draft</Badge>;
            case 'CANCELLED':
                return <Badge variant="danger" size="sm">Cancelled</Badge>;
            default:
                return <Badge size="sm">{status}</Badge>;
        }
    };

    if (isLoading) {
        return <LoadingCard message="Loading orders..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Orders</h1>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="w-48">
                    <Select
                        value={selectedShop}
                        onChange={setSelectedShop}
                        options={shops?.map((s) => ({ label: s.name, value: s.id })) || []}
                        placeholder="Select Shop"
                    />
                </div>
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search orders..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        leftIcon={<Search className="w-5 h-5" />}
                    />
                </div>
                <Tabs
                    tabs={[
                        { id: 'all', label: 'All' },
                        { id: 'DRAFT', label: 'Draft' },
                        { id: 'CONFIRMED', label: 'Confirmed' },
                        { id: 'PAID', label: 'Paid' },
                    ]}
                    activeTab={statusFilter}
                    onChange={setStatusFilter}
                    variant="pills"
                />
            </div>

            {/* Orders Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Order No</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Session</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Customer</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {orders?.map((order) => (
                            <tr
                                key={order.id}
                                onClick={() => navigate(`/orders/${order.id}`)}
                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                                <td className="px-4 py-4 font-medium text-foreground">#{order.orderNumber}</td>
                                <td className="px-4 py-4 text-muted-foreground text-sm">{order.sessionId?.slice(0, 8)}...</td>
                                <td className="px-4 py-4 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                                <td className="px-4 py-4 font-semibold text-foreground">{formatCurrency(order.totalAmount)}</td>
                                <td className="px-4 py-4 text-muted-foreground">{order.customer?.name || '-'}</td>
                                <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                                <td className="px-4 py-4 text-right">
                                    <ChevronRight className="w-5 h-5 text-muted-foreground inline" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {orders?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No orders found
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderList;
