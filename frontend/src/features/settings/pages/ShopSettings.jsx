import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Smartphone, Banknote, Plus, Trash2, QrCode, Download, Upload, Copy, ExternalLink } from 'lucide-react';
import { Button, Input, Card, Toggle, Select, LoadingCard, Tabs, Modal } from '../../../components/ui';
import { shopApi, floorApi, tableApi } from '../../../services/api';
import QRCode from 'react-qr-code';

const ShopSettings = () => {
    const { shopId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('payment');
    const [selectedFloor, setSelectedFloor] = useState('');
    const [showNewTableModal, setShowNewTableModal] = useState(false);
    const [showNewFloorModal, setShowNewFloorModal] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newFloorName, setNewFloorName] = useState('');
    const [newTableCapacity, setNewTableCapacity] = useState('4');
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQR, setSelectedQR] = useState({ url: '', label: '' });
    const [copySuccess, setCopySuccess] = useState('');

    // Fetch shop
    const { data: shop, isLoading } = useQuery({
        queryKey: ['shop', shopId],
        queryFn: async () => {
            const response = await shopApi.getById(shopId);
            return response.data.data;
        },
        enabled: !!shopId,
    });

    // Fetch floors
    const { data: floors } = useQuery({
        queryKey: ['floors', shopId],
        queryFn: async () => {
            const response = await floorApi.getByShop(shopId);
            return response.data.data;
        },
        enabled: !!shopId,
    });

    // Set default selected floor
    React.useEffect(() => {
        if (floors?.length > 0 && !selectedFloor) {
            setSelectedFloor(floors[0].id);
        }
    }, [floors, selectedFloor]);

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: (data) => shopApi.updateSettings(shopId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shop'] });
        },
    });

    // Create floor mutation
    const createFloorMutation = useMutation({
        mutationFn: (name) => floorApi.create(shopId, { name, level: floors?.length || 0 }),
        onSuccess: (response) => {
            const newFloor = response.data.data;
            queryClient.invalidateQueries({ queryKey: ['floors'] });
            setShowNewFloorModal(false);
            setNewFloorName('');
            setSelectedFloor(newFloor.id);
        },
    });

    // Create table mutation
    const createTableMutation = useMutation({
        mutationFn: (data) =>
            tableApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['floors'] });
            setShowNewTableModal(false);
            setNewTableName('');
        },
    });

    // Toggle table active
    const toggleTableMutation = useMutation({
        mutationFn: ({ id, isActive }) =>
            tableApi.update(id, { isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['floors'] });
        },
    });

    const currentFloor = floors?.find((f) => f.id === selectedFloor);

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(label);
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const openQRModal = (url, label) => {
        setSelectedQR({ url, label });
        setShowQRModal(true);
    };

    const downloadQR = (url, filename) => {
        // Create a temporary canvas to convert SVG to PNG
        const svg = document.getElementById('qr-modal-svg');
        if (!svg) return;

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 300, 300);
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = pngUrl;
            link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleDownloadAllQRs = async () => {
        try {
            const response = await tableApi.downloadAllQr(shopId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${shop?.name || 'shop'}-table-qr-codes.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading QR sheet:', error);
        }
    };

    if (isLoading) {
        return <LoadingCard message="Loading settings..." />;
    }

    const shopOrderingUrl = `${window.location.origin}/m/s/${shopId}`;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">{shop?.name} Settings</h1>
            </div>

            {/* Tabs */}
            <Tabs
                tabs={[
                    { id: 'payment', label: 'Payment Methods' },
                    { id: 'floor', label: 'Floor Plan' },
                    { id: 'mobile', label: 'Mobile Order' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
            />

            <div className="mt-6">
                {/* Payment Methods */}
                {activeTab === 'payment' && (
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Payment Methods</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Banknote className="w-6 h-6 text-success" />
                                    <span className="font-medium text-foreground">Cash</span>
                                </div>
                                <Toggle
                                    checked={shop?.isCashEnabled || false}
                                    onChange={(checked) => updateMutation.mutate({ isCashEnabled: checked })}
                                />
                            </div>

                            <div className="p-4 bg-muted/30 border border-border rounded-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-6 h-6 text-primary" />
                                        <span className="font-medium text-foreground">UPI (QR)</span>
                                    </div>
                                    <Toggle
                                        checked={shop?.isUpiEnabled || false}
                                        onChange={(checked) => updateMutation.mutate({ isUpiEnabled: checked })}
                                    />
                                </div>
                                {shop?.isUpiEnabled && (
                                    <Input
                                        label="UPI ID"
                                        placeholder="yourname@upi"
                                        value={shop?.upiId || ''}
                                        onChange={(e) => updateMutation.mutate({ upiId: e.target.value })}
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-6 h-6 text-accent" />
                                    <span className="font-medium text-foreground">Digital (Card/Bank)</span>
                                </div>
                                <Toggle
                                    checked={shop?.isDigitalEnabled || false}
                                    onChange={(checked) => updateMutation.mutate({ isDigitalEnabled: checked })}
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Floor Plan */}
                {activeTab === 'floor' && (
                    <Card padding="lg">
                        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap sm:flex-nowrap">
                            <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">Floor Plan</h2>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex-1 sm:w-48">
                                    <Select
                                        value={selectedFloor}
                                        onChange={setSelectedFloor}
                                        options={floors?.map((f) => ({ label: f.name, value: f.id })) || []}
                                        placeholder="Select floor"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => setShowNewFloorModal(true)}
                                    className="whitespace-nowrap"
                                >
                                    Add Floor
                                </Button>
                                <Button
                                    size="sm"
                                    leftIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => setShowNewTableModal(true)}
                                    className="whitespace-nowrap"
                                >
                                    Add Table
                                </Button>
                            </div>
                        </div>

                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Seats</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Active</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Capacity</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">QR Code</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-600">
                                    {currentFloor?.tables.map((table) => {
                                        const tableUrl = `${window.location.origin}/m/${table.token}`;
                                        return (
                                            <tr key={table.id} className="hover:bg-muted/50 border-b border-border last:border-0">
                                                <td className="px-4 py-3 font-medium text-foreground">{table.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{table.capacity}</td>
                                                <td className="px-4 py-3">
                                                    <Toggle
                                                        checked={table.isActive}
                                                        onChange={(checked) => toggleTableMutation.mutate({ id: table.id, isActive: checked })}
                                                        size="sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {table.currentOccupancy}/{table.capacity}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => openQRModal(tableUrl, table.name)}
                                                        className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                                                    >
                                                        <QrCode className="w-5 h-5 text-primary" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {currentFloor?.tables.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No tables on this floor
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-4">
                            <Button
                                variant="secondary"
                                leftIcon={<Download className="w-5 h-5" />}
                                onClick={handleDownloadAllQRs}
                            >
                                Download All QR Codes (PDF)
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Mobile Order */}
                {activeTab === 'mobile' && (
                    <Card padding="lg">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Mobile Ordering</h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl">
                                <div>
                                    <span className="font-medium text-foreground">Self Ordering (Mobile)</span>
                                    <p className="text-sm text-muted-foreground">Allow customers to order via mobile</p>
                                </div>
                                <Toggle
                                    checked={shop?.selfOrderEnabled || false}
                                    onChange={(checked) => updateMutation.mutate({ selfOrderEnabled: checked })}
                                />
                            </div>

                            {shop?.selfOrderEnabled && (
                                <>
                                    {/* Shop Ordering Link with QR */}
                                    <div className="p-4 bg-muted/30 border border-border rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="font-medium text-foreground">Shop Ordering Link</span>
                                                <p className="text-sm text-muted-foreground">One link for all tables (customers select table)</p>
                                            </div>
                                            <Toggle
                                                checked={shop?.onlineOrderEnabled || false}
                                                onChange={(checked) => updateMutation.mutate({ onlineOrderEnabled: checked })}
                                                size="sm"
                                            />
                                        </div>

                                        {shop?.onlineOrderEnabled && (
                                            <div className="flex gap-6 items-start">
                                                {/* QR Code */}
                                                <div
                                                    className="bg-white p-3 rounded-xl cursor-pointer hover:scale-105 transition-transform"
                                                    onClick={() => openQRModal(shopOrderingUrl, 'Shop Order Link')}
                                                >
                                                    <QRCode value={shopOrderingUrl} size={120} />
                                                </div>

                                                {/* Link and Actions */}
                                                <div className="flex-1 space-y-3">
                                                    <div className="bg-card border border-border p-3 rounded-lg">
                                                        <p className="text-xs text-muted-foreground mb-1">Ordering URL</p>
                                                        <p className="text-primary text-sm break-all">{shopOrderingUrl}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            leftIcon={<Copy className="w-4 h-4" />}
                                                            onClick={() => copyToClipboard(shopOrderingUrl, 'shop')}
                                                        >
                                                            {copySuccess === 'shop' ? 'Copied!' : 'Copy Link'}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            leftIcon={<ExternalLink className="w-4 h-4" />}
                                                            onClick={() => window.open(shopOrderingUrl, '_blank')}
                                                        >
                                                            Open
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Table-specific QR codes */}
                                    <div className="p-4 bg-muted/30 border border-border rounded-xl">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="font-medium text-foreground">Table QR Codes</span>
                                                <p className="text-sm text-muted-foreground">Direct links for each table</p>
                                            </div>
                                            <Toggle
                                                checked={shop?.qrMenuEnabled || false}
                                                onChange={(checked) => updateMutation.mutate({ qrMenuEnabled: checked })}
                                                size="sm"
                                            />
                                        </div>

                                        {shop?.qrMenuEnabled && (
                                            <div className="space-y-4">
                                                {floors?.map(floor => (
                                                    <div key={floor.id}>
                                                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">{floor.name}</div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                            {floor.tables.map(table => {
                                                                const tableUrl = `${window.location.origin}/m/${table.token}`;
                                                                return (
                                                                    <div
                                                                        key={table.id}
                                                                        className="bg-muted hover:bg-muted/80 p-3 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-colors border border-border"
                                                                        onClick={() => openQRModal(tableUrl, table.name)}
                                                                    >
                                                                        <div className="bg-white p-2 rounded-lg border border-border">
                                                                            <QRCode value={tableUrl} size={60} />
                                                                        </div>
                                                                        <span className="text-foreground font-medium text-sm">{table.name}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="flex justify-end pt-2">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        leftIcon={<Download className="w-4 h-4" />}
                                                        onClick={handleDownloadAllQRs}
                                                    >
                                                        Download All (PDF)
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">Theme Color</label>
                                        <div className="flex gap-3">
                                            {[
                                                { name: 'Indigo', value: '#4F46E5', class: 'bg-indigo-600' },
                                                { name: 'Emerald', value: '#10B981', class: 'bg-emerald-500' },
                                                { name: 'Rose', value: '#F43F5E', class: 'bg-rose-500' },
                                                { name: 'Amber', value: '#F59E0B', class: 'bg-amber-500' },
                                                { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
                                                { name: 'Violet', value: '#8B5CF6', class: 'bg-violet-500' },
                                            ].map((color) => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => updateMutation.mutate({ themeColor: color.value })}
                                                    className={`w-10 h-10 rounded-full transition-all ${(shop?.themeColor || '#4F46E5') === color.value
                                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800 scale-110'
                                                        : 'hover:scale-110 opacity-80 hover:opacity-100'
                                                        }`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                    aria-label={`Select ${color.name} theme`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-2">Payment Mode</label>
                                        <Select
                                            value={shop?.paymentMode || 'PAY_AT_COUNTER'}
                                            onChange={(value) => updateMutation.mutate({ paymentMode: value })}
                                            options={[
                                                { label: 'Pay at Counter', value: 'PAY_AT_COUNTER' },
                                            ]}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                )}
            </div>

            {/* New Table Modal */}
            <Modal
                isOpen={showNewTableModal}
                onClose={() => setShowNewTableModal(false)}
                title="Add Table"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => setShowNewTableModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createTableMutation.mutate({
                                name: newTableName,
                                capacity: parseInt(newTableCapacity) || 4,
                                floorId: selectedFloor,
                            })}
                            isLoading={createTableMutation.isPending}
                            disabled={!newTableName.trim()}
                        >
                            Add
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Table Name"
                        placeholder="e.g., T1, Table 1"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                    />
                    <Input
                        label="Capacity"
                        type="number"
                        placeholder="4"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(e.target.value)}
                    />
                </div>
            </Modal>

            {/* New Floor Modal */}
            <Modal
                isOpen={showNewFloorModal}
                onClose={() => setShowNewFloorModal(false)}
                title="Add Floor"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => setShowNewFloorModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => createFloorMutation.mutate(newFloorName)}
                            isLoading={createFloorMutation.isPending}
                            disabled={!newFloorName.trim()}
                        >
                            Add
                        </Button>
                    </div>
                }
            >
                <div>
                    <Input
                        label="Floor Name"
                        placeholder="e.g., Ground Floor, First Floor"
                        value={newFloorName}
                        onChange={(e) => setNewFloorName(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>

            {/* QR Code Modal */}
            <Modal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                title={`QR Code - ${selectedQR.label}`}
            >
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="bg-white p-6 rounded-2xl">
                        <QRCode
                            id="qr-modal-svg"
                            value={selectedQR.url || 'https://example.com'}
                            size={250}
                        />
                    </div>

                    <div className="w-full bg-dark-800 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">URL</p>
                        <p className="text-primary text-sm break-all">{selectedQR.url}</p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            leftIcon={<Copy className="w-4 h-4" />}
                            onClick={() => copyToClipboard(selectedQR.url, 'modal')}
                        >
                            {copySuccess === 'modal' ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <Button
                            leftIcon={<Download className="w-4 h-4" />}
                            onClick={() => downloadQR(selectedQR.url, selectedQR.label)}
                        >
                            Download PNG
                        </Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
};

export default ShopSettings;
