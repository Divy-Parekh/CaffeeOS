import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Input, Tabs, Badge, LoadingCard, Select } from '../../../components/ui';
import { paymentApi, shopApi } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

import { formatCurrency, formatDate } from '../../../utils/format';

const PaymentList = () => {
    const [methodFilter, setMethodFilter] = useState('all');
    const [searchInput, setSearchInput] = useState('');
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

    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments', selectedShop, methodFilter, debouncedSearch],
        queryFn: async () => {
            const params = {
                ...(methodFilter !== 'all' && { method: methodFilter }),
                ...(debouncedSearch && { search: debouncedSearch })
            };
            const response = await paymentApi.getByShop(selectedShop, params);
            return response.data.data;
        },
        enabled: !!selectedShop,
    });

    const getMethodIcon = (method) => {
        switch (method) {
            case 'CASH':
                return <Banknote className="w-5 h-5 text-success" />;
            case 'UPI':
                return <Smartphone className="w-5 h-5 text-primary" />;
            case 'CARD':
                return <CreditCard className="w-5 h-5 text-accent" />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return <LoadingCard message="Loading payments..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Payments</h1>
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
                        placeholder="Search payments..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        leftIcon={<Search className="w-5 h-5" />}
                    />
                </div>
                <Tabs
                    tabs={[
                        { id: 'all', label: 'All' },
                        { id: 'CASH', label: 'Cash' },
                        { id: 'UPI', label: 'UPI' },
                        { id: 'CARD', label: 'Card' },
                    ]}
                    activeTab={methodFilter}
                    onChange={setMethodFilter}
                    variant="pills"
                />
            </div>

            {/* Payments Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Payment Method</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {payments?.map((payment) => (
                            <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        {getMethodIcon(payment.method)}
                                        <span className="font-medium text-foreground">{payment.method}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-muted-foreground">{formatDate(payment.createdAt)}</td>
                                <td className="px-4 py-4 text-right font-semibold text-foreground">{formatCurrency(payment.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {payments?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No payments found
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentList;
