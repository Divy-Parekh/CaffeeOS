import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Clock, Check, ChefHat, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, Badge } from '../../../components/ui';
import { kitchenApi } from '../../../services/api';
import { getSocket, connectSocket, SOCKET_EVENTS } from '../../../services/socket';

const statusColumns = [
    { id: 'TO_COOK', label: 'To Cook', color: 'text-gray-400' },
    { id: 'PREPARING', label: 'Preparing', color: 'text-warning' },
    { id: 'COMPLETED', label: 'Completed', color: 'text-success' },
];

const KitchenDisplay = () => {
    const { shopId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch tickets
    const { data: ticketData, refetch } = useQuery({
        queryKey: ['kitchen-tickets', shopId],
        queryFn: async () => {
            const response = await kitchenApi.getTickets(shopId);
            // API returns { tickets, counts } structure
            return response.data.data;
        },
        enabled: !!shopId,
        refetchInterval: 3000, // Poll every 3 seconds as fallback
    });

    // Extract tickets from response (handles both old and new format)
    const allTickets = ticketData?.tickets || ticketData || [];

    // Debug log to see ticket data
    console.log('🎟️ All tickets:', allTickets.length, 'items, statuses:',
        allTickets.reduce((acc, t) => {
            acc[t.kitchenStatus] = (acc[t.kitchenStatus] || 0) + 1;
            return acc;
        }, {}));

    // Update ticket status mutation
    const updateStatusMutation = useMutation({
        mutationFn: ({ orderId, status }) =>
            kitchenApi.updateStatus(orderId, status),
        onSuccess: () => {
            refetch();
        },
    });

    // Update item status mutation
    const updateItemMutation = useMutation({
        mutationFn: ({ orderId, itemId, isPrepared }) =>
            kitchenApi.updateItemStatus(orderId, itemId, isPrepared),
        onSuccess: () => {
            refetch();
        },
    });

    // Socket connection for real-time updates
    useEffect(() => {
        if (shopId) {
            const socket = connectSocket(shopId);

            // Log connection status for debugging
            socket.on('connect', () => {
                console.log('🔌 Kitchen socket connected, joining shop:', shopId);
                socket.emit('join_shop', shopId);
            });

            socket.on(SOCKET_EVENTS.NEW_TICKET, async (data) => {
                console.log('🎫 New ticket received:', data);
                const result = await refetch();
                console.log('🔄 Refetch completed, got', result.data?.tickets?.length || result.data?.length || 0, 'tickets');
            });

            socket.on(SOCKET_EVENTS.ORDER_STATUS_CHANGE, async (data) => {
                console.log('📋 Order status change:', data);
                await refetch();
            });

            // Ensure socket is connected
            if (!socket.connected) {
                socket.connect();
            }

            return () => {
                socket.off('connect');
                socket.off(SOCKET_EVENTS.NEW_TICKET);
                socket.off(SOCKET_EVENTS.ORDER_STATUS_CHANGE);
            };
        }
    }, [shopId, refetch]);

    const getTicketsByStatus = (status) => {
        return allTickets?.filter((t) => {
            const matchesStatus = t.kitchenStatus === status;
            const matchesSearch = t.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesStatus && matchesSearch;
        }) || [];
    };

    const getStatusCounts = () => {
        return {
            all: allTickets?.length || 0,
            TO_COOK: allTickets?.filter((t) => t.kitchenStatus === 'TO_COOK').length || 0,
            PREPARING: allTickets?.filter((t) => t.kitchenStatus === 'PREPARING').length || 0,
            COMPLETED: allTickets?.filter((t) => t.kitchenStatus === 'COMPLETED').length || 0,
        };
    };

    const handleTicketClick = (order) => {
        const nextStatus = {
            TO_COOK: 'PREPARING',
            PREPARING: 'COMPLETED',
            COMPLETED: 'DELIVERED', // Dismiss from kitchen view
        };

        updateStatusMutation.mutate({
            orderId: order.id,
            status: nextStatus[order.kitchenStatus],
        });
    };

    const handleItemClick = (order, item, e) => {
        e.stopPropagation();
        updateItemMutation.mutate({
            orderId: order.id,
            itemId: item.id,
            isPrepared: !item.isPrepared,
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const counts = getStatusCounts();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b border-border px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-foreground" />
                        </button>
                        <ChefHat className="w-8 h-8 text-primary" />
                        <h1 className="text-2xl font-bold text-foreground">Kitchen Display</h1>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>

                <Tabs
                    tabs={[
                        { id: 'all', label: 'All', count: counts.all },
                        { id: 'TO_COOK', label: 'To Cook', count: counts.TO_COOK },
                        { id: 'PREPARING', label: 'Preparing', count: counts.PREPARING },
                        { id: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
                    ]}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    variant="pills"
                />
            </header>

            {/* Kanban Board */}
            <main className="flex-1 overflow-hidden p-6">
                <div className="h-full flex gap-6">
                    {statusColumns.map((column) => {
                        const tickets = getTicketsByStatus(column.id);
                        const shouldShow = activeTab === 'all' || activeTab === column.id;

                        if (!shouldShow) return null;

                        return (
                            <div
                                key={column.id}
                                className={`flex-1 flex flex-col min-w-[300px] ${activeTab !== 'all' ? 'max-w-3xl mx-auto' : ''}`}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className={`text-lg font-semibold ${column.color}`}>
                                        {column.label}
                                    </h2>
                                    <Badge variant={column.id === 'COMPLETED' ? 'success' : column.id === 'PREPARING' ? 'warning' : 'default'}>
                                        {tickets.length}
                                    </Badge>
                                </div>

                                {/* Tickets */}
                                <div className="flex-1 overflow-auto space-y-4 [&::-webkit-scrollbar]:hidden scrollbar-none">
                                    <AnimatePresence>
                                        {tickets.map((order) => (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                onClick={() => handleTicketClick(order)}
                                                className={`
                          bg-card border rounded-xl overflow-hidden cursor-pointer
                          transition-all 
                          ${activeTab === 'all' ? 'hover:scale-[1.005]' : 'hover:scale-[1.02]'}
                          ${column.id === 'TO_COOK' ? 'border-border' : ''}
                          ${column.id === 'PREPARING' ? 'border-warning/50' : ''}
                          ${column.id === 'COMPLETED' ? 'border-success/50' : ''}
                        `}
                                            >
                                                {/* Ticket Header */}
                                                <div className={`
                          px-4 py-3 flex items-center justify-between
                          ${column.id === 'TO_COOK' ? 'bg-muted' : ''}
                          ${column.id === 'PREPARING' ? 'bg-warning/10' : ''}
                          ${column.id === 'COMPLETED' ? 'bg-success/10' : ''}
                        `}>
                                                    <span className="font-bold text-foreground">
                                                        #{order.orderNumber}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{formatTime(order.createdAt)}</span>
                                                    </div>
                                                </div>

                                                {/* Ticket Items */}
                                                <div className="px-4 py-3 space-y-2">
                                                    {order.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            onClick={(e) => handleItemClick(order, item, e)}
                                                            className={`
                                flex items-center justify-between py-2 px-3 rounded-lg
                                cursor-pointer transition-all
                                ${item.isPrepared
                                                                    ? 'bg-success/10 text-success line-through'
                                                                    : 'bg-muted text-foreground hover:bg-muted/80'
                                                                }
                              `}
                                                        >
                                                            <span className="font-medium">
                                                                {item.quantity}x {item.productName}
                                                            </span>
                                                            {item.isPrepared && (
                                                                <Check className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Table Info */}
                                                {order.table && (
                                                    <div className="px-4 py-2 border-t border-border text-sm text-muted-foreground">
                                                        Table: {order.table.name}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {tickets.length === 0 && (
                                        <div className="text-center py-12 text-gray-500">
                                            <p>No tickets</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default KitchenDisplay;
