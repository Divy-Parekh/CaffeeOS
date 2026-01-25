import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, User, Phone, Mail } from 'lucide-react';
import { Button, Input, Modal, Card, LoadingCard, Select } from '../../../components/ui';
import { customerApi, shopApi } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';
import { INDIAN_STATES } from '../../../types';

import { formatCurrency } from '../../../utils/format';

const CustomerList = () => {
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState('');
    const [selectedShop, setSelectedShop] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
    });

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

    const { data: customers, isLoading } = useQuery({
        queryKey: ['customers', selectedShop, debouncedSearch],
        queryFn: async () => {
            const response = await customerApi.getByShop(selectedShop, debouncedSearch);
            return response.data.data;
        },
        enabled: !!selectedShop,
    });

    const createMutation = useMutation({
        mutationFn: (data) => customerApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setShowNewModal(false);
            setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'India' });
        },
    });

    const handleCreate = () => {
        if (!formData.name.trim()) return;
        createMutation.mutate({ ...formData, shopId: selectedShop });
    };

    if (isLoading) {
        return <LoadingCard message="Loading customers..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Customers</h1>
                <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowNewModal(true)}>
                    New
                </Button>
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
                        placeholder="Search customers..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        leftIcon={<Search className="w-5 h-5" />}
                    />
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Contact</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {customers?.map((customer) => (
                            <tr key={customer.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <span className="font-medium text-foreground">{customer.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="text-sm">
                                        {customer.email && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                                {customer.email}
                                            </div>
                                        )}
                                        {customer.phone && (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Phone className="w-4 h-4" />
                                                {customer.phone}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-foreground">
                                    {formatCurrency(customer.totalSales)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {customers?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No customers found
                    </div>
                )}
            </div>

            {/* New Customer Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                title="New Customer"
                size="lg"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => setShowNewModal(false)}>
                            Discard
                        </Button>
                        <Button
                            onClick={handleCreate}
                            isLoading={createMutation.isPending}
                            disabled={!formData.name.trim()}
                        >
                            Save
                        </Button>
                    </div>
                }
            >
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Name"
                        placeholder="Customer name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="col-span-2"
                    />
                    <Input
                        label="Email"
                        type="email"
                        placeholder="customer@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Phone"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Input
                        label="Address"
                        placeholder="Street address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="col-span-2"
                    />
                    <Input
                        label="City"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    <Select
                        label="State"
                        value={formData.state}
                        onChange={(value) => setFormData({ ...formData, state: value })}
                        options={INDIAN_STATES.map((s) => ({ label: s, value: s }))}
                        placeholder="Select state"
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CustomerList;
