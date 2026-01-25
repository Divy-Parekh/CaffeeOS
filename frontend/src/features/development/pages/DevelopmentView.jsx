import React, { useState } from 'react';
import {
    Activity, User, ShoppingCart, CreditCard, Settings,
    CheckCircle, AlertTriangle, XCircle, Info,
    Search, Plus, Filter, Trash2, Edit2
} from 'lucide-react';
import {
    Button, Input, Badge, Card, Modal,
    Tabs, Toggle, Dropdown, Spinner
} from '../../../components/ui';

// Dummy Data
const DUMMY_PRODUCTS = [
    { id: 1, name: 'Cappuccino', price: 180, category: 'Coffee' },
    { id: 2, name: 'Croissant', price: 220, category: 'Bakery' },
    { id: 3, name: 'Iced Tea', price: 150, category: 'Beverage' },
];

const DevelopmentView = () => {
    const [activeTab, setActiveTab] = useState('components');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState('default');
    const [toggleState, setToggleState] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const openModal = (type) => {
        setModalType(type);
        setModalOpen(true);
    };

    return (
        <div className="p-8 min-h-screen bg-background text-foreground space-y-8">
            <header className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Development Showcase
                    </h1>
                    <p className="text-muted-foreground">Visual testing for all UI components</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.history.back()}>
                        Go Back
                    </Button>
                </div>
            </header>

            <Tabs
                tabs={[
                    { id: 'components', label: 'UI Components' },
                    { id: 'modals', label: 'Modals & Overlays' },
                    { id: 'data', label: 'Data Display' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                variant="underline"
            />

            {/* UI Components Tab */}
            {activeTab === 'components' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Buttons Section */}
                    <Card title="Buttons">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="text-sm text-gray-400">Variants</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="secondary">Secondary</Button>
                                    <Button variant="accent">Accent</Button>
                                    <Button variant="outline">Outline</Button>
                                    <Button variant="ghost">Ghost</Button>
                                    <Button variant="danger">Danger</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm text-gray-400">Sizes</h4>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button size="sm">Small</Button>
                                    <Button size="md">Medium</Button>
                                    <Button size="lg">Large</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-sm text-gray-400">States</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Button isLoading>Loading</Button>
                                    <Button disabled>Disabled</Button>
                                    <Button leftIcon={<Plus className="w-4 h-4" />}>Icon Left</Button>
                                    <Button rightIcon={<Activity className="w-4 h-4" />}>Icon Right</Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Inputs Section */}
                    <Card title="Inputs">
                        <div className="space-y-4">
                            <Input
                                label="Standard Input"
                                placeholder="Type something..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                            <Input
                                label="With Icon"
                                placeholder="Search..."
                                leftIcon={<Search className="w-4 h-4" />}
                            />
                            <Input
                                label="Error State"
                                placeholder="Invalid input"
                                error="This field is required"
                            />
                            <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                                <span>Toggle Switch</span>
                                <Toggle
                                    checked={toggleState}
                                    onChange={setToggleState}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Badges Section */}
                    <Card title="Badges">
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="default">Default</Badge>
                            <Badge variant="success">Success</Badge>
                            <Badge variant="warning">Warning</Badge>
                            <Badge variant="danger">Danger</Badge>
                            <Badge variant="outline">Outline</Badge>
                        </div>
                    </Card>

                    {/* Loading States */}
                    <Card title="Loading States">
                        <div className="flex items-center gap-8 justify-center p-4">
                            <Spinner size="sm" />
                            <Spinner size="md" />
                            <Spinner size="lg" />
                            <div className="text-primary"><Spinner /></div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modals Tab */}
            {activeTab === 'modals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card title="Modal Triggers">
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={() => openModal('default')}>
                                Default Modal
                            </Button>
                            <Button variant="danger" onClick={() => openModal('delete')}>
                                Delete Confirmation
                            </Button>
                            <Button variant="success" onClick={() => openModal('success')}>
                                Success Message
                            </Button>
                        </div>
                    </Card>

                    <Card title="Dropdowns">
                        <div className="flex gap-4">
                            <Dropdown
                                trigger={<Button variant="outline">Open Menu</Button>}
                                items={[
                                    { label: 'Profile', icon: <User className="w-4 h-4" />, onClick: () => { } },
                                    { label: 'Settings', icon: <Settings className="w-4 h-4" />, onClick: () => { } },
                                    { type: 'divider' },
                                    { label: 'Logout', variant: 'danger', onClick: () => { } },
                                ]}
                            />
                        </div>
                    </Card>
                </div>
            )}

            {/* Data Display Tab */}
            {activeTab === 'data' && (
                <div className="space-y-6">
                    <Card title="Table Layout">
                        <div className="overflow-hidden rounded-lg border border-border">
                            <table className="w-full">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Product</th>
                                        <th className="px-4 py-3 text-left">Category</th>
                                        <th className="px-4 py-3 text-right">Price</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {DUMMY_PRODUCTS.map((p) => (
                                        <tr key={p.id} className="hover:bg-muted/50">
                                            <td className="px-4 py-3">{p.name}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline">{p.category}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">₹{p.price}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-1 hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                                                    <button className="p-1 hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card title="Info Cards">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-card p-4 rounded-xl flex items-center gap-4 border border-border">
                                <div className="p-3 bg-primary/20 rounded-full text-primary">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Total Orders</p>
                                    <p className="text-2xl font-bold">1,234</p>
                                </div>
                            </div>
                            <div className="bg-card p-4 rounded-xl flex items-center gap-4 border border-border">
                                <div className="p-3 bg-success/20 rounded-full text-success">
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Revenue</p>
                                    <p className="text-2xl font-bold">₹45,678</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Demonstration Modals */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={
                    modalType === 'delete' ? 'Delete Item?' :
                        modalType === 'success' ? 'Operation Successful' :
                            'Example Modal'
                }
                size={modalType === 'delete' ? 'sm' : 'md'}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>Close</Button>
                        <Button
                            variant={modalType === 'delete' ? 'danger' : 'primary'}
                            onClick={() => setModalOpen(false)}
                        >
                            {modalType === 'delete' ? 'Delete' : 'Confirm'}
                        </Button>
                    </div>
                }
            >
                {modalType === 'delete' ? (
                    <div className="text-center py-4">
                        <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
                        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
                    </div>
                ) : modalType === 'success' ? (
                    <div className="text-center py-4">
                        <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                        <p>The operation was completed successfully!</p>
                    </div>
                ) : (
                    <p>This is a standard modal content area. You can put forms, text, or any other components here.</p>
                )}
            </Modal>
        </div>
    );
};

export default DevelopmentView;
