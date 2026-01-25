import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, TrendingUp, TrendingDown, ShoppingBag, DollarSign, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button, Card, Select, LoadingCard } from '../../../components/ui';
import { reportApi, shopApi } from '../../../services/api';
import { useAppSelector } from '../../../hooks/useRedux';

const COLORS = ['#714B67', '#00A09D', '#F0AD4E', '#D9534F', '#5BC0DE', '#5CB85C'];

const ReportDashboard = () => {
    const currentShop = useAppSelector((state) => state.session.currentShop);
    const [period, setPeriod] = useState('today');
    const [selectedShopId, setSelectedShopId] = useState(currentShop?.id || '');

    // Fetch all shops for the selector
    const { data: shops } = useQuery({
        queryKey: ['shops'],
        queryFn: async () => {
            const response = await shopApi.getAll();
            return response.data.data;
        },
    });

    // Update selected shop when shops load or currentShop changes
    React.useEffect(() => {
        if (!selectedShopId && shops?.length > 0) {
            setSelectedShopId(currentShop?.id || shops[0].id);
        }
    }, [shops, currentShop, selectedShopId]);

    const { data: report, isLoading } = useQuery({
        queryKey: ['report', selectedShopId, period],
        queryFn: async () => {
            const response = await reportApi.getDashboard(selectedShopId, { period });
            return response.data.data;
        },
        enabled: !!selectedShopId,
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const handleExportPdf = () => {
        // Use full URL to match API configuration
        const token = localStorage.getItem('token');
        const url = `http://localhost:3000/api/v1/reports/export?shopId=${currentShop?.id}&period=${period}`;

        // For authenticated download via window.open, typically we can't easily pass headers.
        // If the backend requires auth for export (it does), this might fail if using window.open without a cookie or query param token.
        // However, for now let's try opening it. If it fails, we might need to use the api.get(..., {responseType: 'blob'}) approach.
        // Let's stick to the window.open for now as per plan, but warning: Auth might block it.
        // Actually, let's use the blob approach to be safe with Auth.

        reportApi.exportPdf(selectedShopId, { period })
            .then((response) => {
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `report-${period}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
            .catch((error) => {
                console.error("Failed to download PDF", error);
                alert("Failed to download PDF");
            });
    };

    if (isLoading) {
        return <LoadingCard message="Loading report..." />;
    }

    // Data mapping
    const stats = {
        totalOrders: report?.summary?.totalOrders || 0,
        revenue: report?.summary?.revenue || 0,
        averageOrder: report?.summary?.averageOrder || 0,
        ordersChange: 0, // Backend doesn't provide this yet
        revenueChange: 0, // Backend doesn't provide this yet
    };

    const salesData = report?.salesChart || [];

    // Map backend 'percentage' to frontend 'value' for PieChart
    const categoryData = report?.topCategories?.map(cat => ({
        name: cat.name,
        value: cat.percentage
    })) || [];

    const topOrders = report?.topOrders || [];
    const topProducts = report?.topProducts || [];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-foreground whitespace-nowrap">Reporting Dashboard</h1>
                <div className="flex items-center gap-2">
                    <div className="w-[180px]">
                        <Select
                            value={selectedShopId}
                            onChange={setSelectedShopId}
                            options={shops?.map((s) => ({ label: s.name, value: s.id })) || []}
                            placeholder="Select Shop"
                        />
                    </div>
                    <div className="w-[140px]">
                        <Select
                            value={period}
                            onChange={setPeriod}
                            options={[
                                { label: 'Today', value: 'today' },
                                { label: 'This Week', value: 'weekly' },
                                { label: 'This Month', value: 'monthly' },
                                { label: '365 Days', value: 'yearly' },
                            ]}
                        />
                    </div>
                    <Button
                        variant="secondary"
                        leftIcon={<Download className="w-5 h-5" />}
                        onClick={handleExportPdf}
                        className="whitespace-nowrap"
                    >
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card padding="lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm mb-1">Total Orders</p>
                            <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${stats.ordersChange >= 0 ? 'text-success' : 'text-danger'}`}>
                            {stats.ordersChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{Math.abs(stats.ordersChange)}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
                        <ShoppingBag className="w-4 h-4" />
                        <span>from last period</span>
                    </div>
                </Card>

                <Card padding="lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm mb-1">Revenue</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.revenue)}</p>
                        </div>
                        <div className={`flex items-center gap-1 text-sm ${stats.revenueChange >= 0 ? 'text-success' : 'text-danger'}`}>
                            {stats.revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{Math.abs(stats.revenueChange)}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
                        <DollarSign className="w-4 h-4" />
                        <span>from last period</span>
                    </div>
                </Card>

                <Card padding="lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm mb-1">Average Order</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.averageOrder)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        <span>per transaction</span>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Sales Chart */}
                <Card padding="lg">
                    <h3 className="font-semibold text-foreground mb-4">Sales Overview</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={salesData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#3D3D3D" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis stroke="#9CA3AF" tickFormatter={(value) => `₹${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #3D3D3D' }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Bar dataKey="revenue" fill="#714B67" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Category Pie Chart */}
                <Card padding="lg">
                    <h3 className="font-semibold text-foreground mb-4">Top Selling Categories</h3>
                    <div className="h-64 flex items-center">
                        <div className="w-1/2">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #3D3D3D' }}
                                        formatter={(value) => [`${value}%`, 'Share']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-2">
                            {categoryData.map((cat, idx) => (
                                <div key={cat.name} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                    />
                                    <span className="text-muted-foreground text-sm">{cat.name}</span>
                                    <span className="text-muted-foreground/70 text-sm ml-auto">{cat.value}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Top Orders */}
                <Card padding="lg">
                    <h3 className="font-semibold text-foreground mb-4">Top Orders by Value</h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Order</th>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Customer</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topOrders.slice(0, 5).map((order, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-foreground">#{order.orderNumber}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{order.customer?.name || 'Walk-in'}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(order.totalAmount)}</td>
                                    </tr>
                                ))}
                                {topOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No orders yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Top Products */}
                <Card padding="lg">
                    <h3 className="font-semibold text-foreground mb-4">Top Products</h3>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Product</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Qty</th>
                                    <th className="px-4 py-2 text-right text-sm font-medium text-muted-foreground">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topProducts.slice(0, 5).map((product, idx) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-foreground">{product.productName}</td>
                                        <td className="px-4 py-3 text-right text-muted-foreground">{product.quantity}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-foreground">{formatCurrency(product.revenue)}</td>
                                    </tr>
                                ))}
                                {topProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No products sold yet</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportDashboard;
