import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Settings, ChefHat, Users, Clock, DollarSign, Play, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Card, Modal, Input, Dropdown, LoadingCard } from '../../../components/ui';
import { shopApi, sessionApi } from '../../../services/api';
import { useAppDispatch } from '../../../hooks/useRedux';
import { setSession, setShop, clearSession } from '../../../store/sessionSlice';

const Dashboard = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const [showNewShopModal, setShowNewShopModal] = useState(false);
    const [newShopName, setNewShopName] = useState('');
    const [selectedShopId, setSelectedShopId] = useState(null);

    // Fetch shops
    const { data: shopsData, isLoading } = useQuery({
        queryKey: ['shops'],
        queryFn: async () => {
            const response = await shopApi.getAll();
            return response.data.data;
        },
        staleTime: 0, // Always consider data stale to refetch on mount
        refetchOnMount: true, // Refetch when component mounts
    });

    // Create shop mutation
    const createShopMutation = useMutation({
        mutationFn: (name) => shopApi.create({ name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shops'] });
            setShowNewShopModal(false);
            setNewShopName('');
        },
    });

    // Start session mutation
    const startSessionMutation = useMutation({
        mutationFn: (data) =>
            sessionApi.start(data),
        onSuccess: (response, variables) => {
            const session = response.data.data;
            const shop = shopsData?.find((s) => s.id === variables.shopId);

            dispatch(setSession(session));
            dispatch(setShop(shop || null));
            queryClient.invalidateQueries({ queryKey: ['shops'] });
        },
    });

    // Close session mutation
    const closeSessionMutation = useMutation({
        mutationFn: ({ sessionId, closingCash }) =>
            sessionApi.close(sessionId, { closingCash: parseFloat(closingCash) || 0 }),
        onSuccess: () => {
            dispatch(clearSession());
            queryClient.invalidateQueries({ queryKey: ['shops'] });
        },
    });

    // Auto-start session without opening cash modal
    const handleOpenSession = (shop) => {
        setSelectedShopId(shop.id);
        startSessionMutation.mutate({
            shopId: shop.id,
            openingCash: 0, // Auto-set to 0
        });
    };

    const handleContinueSession = (shop) => {
        const session = shop.activeSession;
        dispatch(setSession(session));
        dispatch(setShop(shop));
        navigate(`/pos/${shop.id}/${session.id}/table`);
    };

    // Auto-close session without closing cash modal
    const handleStopSession = (shop) => {
        closeSessionMutation.mutate({
            sessionId: shop.activeSession.id,
            closingCash: 0, // Backend calculates from payments
        });
    };

    const handleMenuAction = (shopId, action) => {
        switch (action) {
            case 'settings':
                navigate(`/settings/${shopId}`);
                break;
            case 'kitchen':
                navigate(`/kitchen/${shopId}`);
                break;
            case 'customer-display':
                window.open(`/customer-display/${shopId}`, '_blank');
                break;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
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
            maximumFractionDigits: 0,
        }).format(amount);
    };

    if (isLoading) {
        return <LoadingCard message="Loading shops..." />;
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
                <Button
                    leftIcon={<Plus className="w-5 h-5" />}
                    onClick={() => setShowNewShopModal(true)}
                >
                    New
                </Button>
            </div>

            {/* Shop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {shopsData?.map((shop, index) => (
                    <motion.div
                        key={shop.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <Card className="relative" hover>
                            {/* Menu Button */}
                            <div className="absolute top-4 right-4">
                                <Dropdown
                                    trigger={
                                        <button className="p-2 hover:bg-muted rounded-lg">
                                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    }
                                    items={[
                                        { label: 'Settings', value: 'settings', icon: <Settings className="w-4 h-4" /> },
                                        { label: 'Kitchen Display', value: 'kitchen', icon: <ChefHat className="w-4 h-4" /> },
                                        { label: 'Customer Display', value: 'customer-display', icon: <Users className="w-4 h-4" /> },
                                    ]}
                                    onSelect={(action) => handleMenuAction(shop.id, action)}
                                />
                            </div>

                            {/* Shop Name */}
                            <h3 className="text-xl font-semibold text-foreground mb-4 pr-12">
                                {shop.name}
                            </h3>

                            {/* Stats */}
                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>Last open: {formatDate(shop.lastOpenTime)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <DollarSign className="w-4 h-4" />
                                    <span>Last Sell: {formatCurrency(shop.lastRevenue)}</span>
                                </div>
                            </div>

                            {/* Session Buttons */}
                            {shop.activeSession ? (
                                <div className="flex gap-2">
                                    <Button
                                        fullWidth
                                        variant="primary"
                                        leftIcon={<Play className="w-4 h-4" />}
                                        onClick={() => handleContinueSession(shop)}
                                    >
                                        Continue
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        leftIcon={<Square className="w-4 h-4" />}
                                        onClick={() => handleStopSession(shop)}
                                        isLoading={closeSessionMutation.isPending && closeSessionMutation.variables?.sessionId === shop.activeSession.id}
                                        className="text-danger border-danger hover:bg-danger/10"
                                    >
                                        Stop
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    fullWidth
                                    variant="accent"
                                    leftIcon={<Play className="w-4 h-4" />}
                                    onClick={() => handleOpenSession(shop)}
                                    isLoading={startSessionMutation.isPending && selectedShopId === shop.id}
                                >
                                    Open Session
                                </Button>
                            )}
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Empty State */}
            {shopsData?.length === 0 && (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No shops yet</h3>
                    <p className="text-muted-foreground mb-6">Create your first shop to get started</p>
                    <Button
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => setShowNewShopModal(true)}
                    >
                        Create Shop
                    </Button>
                </div>
            )}

            {/* New Shop Modal */}
            <Modal
                isOpen={showNewShopModal}
                onClose={() => setShowNewShopModal(false)}
                title="New Shop"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => setShowNewShopModal(false)}>
                            Discard
                        </Button>
                        <Button
                            onClick={() => createShopMutation.mutate(newShopName)}
                            isLoading={createShopMutation.isPending}
                            disabled={!newShopName.trim()}
                        >
                            Save
                        </Button>
                    </div>
                }
            >
                <Input
                    label="Shop Name"
                    placeholder="Enter shop name"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    autoFocus
                />
            </Modal>
        </div>
    );
};

export default Dashboard;
