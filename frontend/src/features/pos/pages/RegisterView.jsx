import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, User, StickyNote, Plus, Minus, X,
    Send, CreditCard, Percent, Gift, Filter, ChevronDown, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Modal, LoadingCard } from '../../../components/ui';
import { productApi, customerApi, orderApi, categoryApi, floorApi } from '../../../services/api';
import { useAppSelector, useAppDispatch } from '../../../hooks/useRedux';
import {
    addItem, incrementItem, decrementItem, removeItem,
    setCustomer, setTable, setNotes, setDiscount, setTip, setOrderId, clearCart,
    selectCartSubtotal, selectCartTax, selectCartDiscount, selectCartTip, selectCartTotal
} from '../../../store/cartSlice';
import PaymentModal from '../components/PaymentModal';
import { getSocket, SOCKET_EVENTS } from '../../../services/socket';

const RegisterView = () => {
    const { shopId, sessionId } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    const cart = useAppSelector((state) => state.cart);
    const subtotal = useAppSelector(selectCartSubtotal);
    const tax = useAppSelector(selectCartTax);
    const discountAmount = useAppSelector(selectCartDiscount);
    const tipAmount = useAppSelector(selectCartTip);
    const total = useAppSelector(selectCartTotal);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showCategoryPopup, setShowCategoryPopup] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [orderSent, setOrderSent] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Discount/Tip input states
    const [discountInput, setDiscountInput] = useState('');
    const [discountTypeInput, setDiscountTypeInput] = useState('fixed');
    const [tipInput, setTipInput] = useState('');

    // Initialize inputs from cart state
    React.useEffect(() => {
        if (cart.discount > 0) setDiscountInput(cart.discount.toString());
        if (cart.tip > 0) setTipInput(cart.tip.toString());
        setDiscountTypeInput(cart.discountType || 'fixed');
    }, []); // Only on mount to avoid fighting with user input

    // Fetch ALL products (global)
    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['products', 'all'],
        queryFn: async () => {
            const response = await productApi.getAll();
            return response.data.data;
        },
    });

    // Fetch ALL categories (global)
    const { data: categories } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: async () => {
            const response = await categoryApi.getAll();
            return response.data.data;
        },
    });

    // Fetch all customers (global)
    const { data: customers } = useQuery({
        queryKey: ['customers', 'all'],
        queryFn: async () => {
            const response = await customerApi.getAll();
            return response.data.data;
        },
    });

    // Fetch floors with tables for table selection
    const { data: floors } = useQuery({
        queryKey: ['floors', shopId],
        queryFn: async () => {
            const response = await floorApi.getByShop(shopId);
            return response.data.data;
        },
        enabled: !!shopId,
    });

    // Reset orderSent when cart items change
    React.useEffect(() => {
        if (cart.items.length > 0) {
            setOrderSent(false);
        }
    }, [cart.items]);

    // Create or Update order mutation (Send to Kitchen)
    const createOrderMutation = useMutation({
        mutationFn: async () => {
            const orderData = {
                shopId,
                sessionId,
                tableId: cart.tableId,
                customerId: cart.customerId,
                notes: cart.notes,
                discount: discountAmount || 0,
                tip: tipAmount || 0,
                items: cart.items.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    variantInfo: item.variants,
                })),
            };

            if (cart.orderId) {
                return orderApi.update(cart.orderId, orderData);
            } else {
                return orderApi.create(orderData);
            }
        },
        onSuccess: (response) => {
            const order = response.data.data;
            // Emit to kitchen via Socket
            const socket = getSocket();
            socket.emit(SOCKET_EVENTS.NEW_TICKET, { shopId, order });

            setOrderSent(true);
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to create order';
            if (message.includes('Table capacity reached')) {
                setErrorMessage(message);
                setShowErrorModal(true);
            } else {
                // Handle other errors if needed, maybe alert for now or silent
                console.error("Order creation failed:", error);
                alert(message);
            }
        },
    });

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
            return matchesSearch && matchesCategory && p.isActive;
        });
    }, [products, searchQuery, selectedCategory]);

    const handleProductClick = (product) => {
        const existingItem = cart.items.find((i) => i.productId === product.id);

        if (existingItem) {
            dispatch(incrementItem(product.id));
        } else {
            dispatch(addItem({
                productId: product.id,
                productName: product.name,
                unitPrice: product.basePrice,
                quantity: 1,
                taxPercent: product.taxPercent || 0,
                image: product.image,
            }));
        }
    };

    const handleTableSelect = (table) => {
        dispatch(setTable({ id: table.id, name: table.name }));
        setShowTableModal(false);
    };

    const handleSendToKitchen = () => {
        if (cart.items.length === 0) return;
        createOrderMutation.mutate();
    };

    const applyDiscount = () => {
        const amount = parseFloat(discountInput) || 0;
        dispatch(setDiscount({ amount, type: discountTypeInput }));
        // Don't clear input, let user see value
    };

    const applyTip = () => {
        const amount = parseFloat(tipInput) || 0;
        dispatch(setTip(amount));
        // Don't clear input
    };

    const handleInputKeyDown = (e, action) => {
        if (e.key === 'Enter') {
            action();
            e.target.blur();
        }
    };

    const handlePaymentSuccess = () => {
        dispatch(clearCart());
        setShowPaymentModal(false);
        setOrderSent(false);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const selectedCategoryName = selectedCategory === 'all'
        ? 'All Categories'
        : categories?.find(c => c.id === selectedCategory)?.name || 'Category';

    const activeCategory = categories?.find(c => c.id === selectedCategory);

    if (productsLoading) {
        return <LoadingCard message="Loading products..." />;
    }

    return (
        <div className="h-full flex relative">
            {/* Left Panel - Products (Scrollable) */}
            <div className="flex-1 flex flex-col overflow-hidden mr-[400px]">
                {/* Search & Category Filter */}
                <div className="p-4 border-b border-dark-600 flex gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg pl-10 pr-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Category Filter Button */}
                    <button
                        onClick={() => setShowCategoryPopup(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
                            : 'text-white border-transparent shadow-sm hover:opacity-90'
                            }`}
                        style={selectedCategory !== 'all' && activeCategory?.color ? { backgroundColor: activeCategory.color } : {}}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="max-w-[120px] truncate font-medium">{selectedCategoryName}</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                {/* Product Grid - Scrollable */}
                <div className="flex-1 overflow-auto p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredProducts.map((product) => (
                            <motion.button
                                key={product.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleProductClick(product)}
                                className="bg-card border border-primary/10 rounded-xl p-3 text-left hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all group"
                            >
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full aspect-square object-cover rounded-lg mb-2 bg-dark-700"
                                    />
                                ) : (
                                    <div className="w-full aspect-square bg-dark-700 rounded-lg mb-2 flex items-center justify-center">
                                        <span className="text-3xl text-gray-600">{product.name.charAt(0)}</span>
                                    </div>
                                )}
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm truncate">{product.name}</h4>
                                <p className="text-primary font-bold">{formatCurrency(product.basePrice)}</p>
                            </motion.button>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p>No products found</p>
                            {selectedCategory !== 'all' && (
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className="mt-2 text-primary hover:underline"
                                >
                                    Show all products
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Cart (Fixed) */}
            <div className="fixed right-0 top-14 bottom-0 w-[400px] flex flex-col bg-card border-l border-primary/20 shadow-xl shadow-primary/5">
                {/* Customer & Table Selection */}
                <div className="p-3 border-b border-primary/10 flex gap-2">
                    {/* Customer Button */}
                    <button
                        onClick={() => setShowCustomerModal(true)}
                        className="flex-1 flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-lg hover:bg-primary/10 transition-colors group"
                    >
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-foreground group-hover:text-primary font-medium text-sm truncate">
                            {cart.customerName || 'Customer'}
                        </span>
                    </button>

                    {/* Table Button */}
                    <button
                        onClick={() => setShowTableModal(true)}
                        className="flex-1 flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-lg hover:bg-primary/10 transition-colors group"
                    >
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-foreground group-hover:text-primary font-medium text-sm truncate">
                            {cart.tableName || 'Table'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-primary/50 ml-auto" />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-4">
                    <AnimatePresence>
                        {cart.items.map((item) => (
                            <motion.div
                                key={item.productId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-3 p-3 rounded-lg mb-2 bg-muted"
                            >
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground">{item.productName}</h4>
                                    <p className="text-muted-foreground text-sm">{formatCurrency(item.unitPrice)}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => dispatch(decrementItem(item.productId))}
                                        className="w-8 h-8 bg-card border border-primary/20 rounded-full flex items-center justify-center hover:bg-primary hover:text-white text-primary transition-colors"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-8 text-center font-bold text-foreground">{item.quantity}</span>
                                    <button
                                        onClick={() => dispatch(incrementItem(item.productId))}
                                        className="w-8 h-8 bg-card border border-primary/20 rounded-full flex items-center justify-center hover:bg-primary hover:text-white text-primary transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="text-right min-w-[70px]">
                                    <p className="font-bold text-primary">
                                        {formatCurrency((item.unitPrice || 0) * (item.quantity || 0))}
                                    </p>
                                </div>

                                <button
                                    onClick={() => dispatch(removeItem(item.productId))}
                                    className="p-1 text-muted-foreground hover:text-danger"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {cart.items.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>No items in cart</p>
                            <p className="text-sm mt-1">Click products to add</p>
                        </div>
                    )}
                </div>

                {/* Bottom Section - Notes, Discount, Tip */}
                <div className="border-t border-primary/10">
                    {/* Notes */}
                    <div className="flex items-center gap-2 mb-2 text-sm text-primary font-medium p-3 pb-0">
                        <StickyNote className="w-4 h-4" />
                        <span>Notes</span>
                    </div>
                    <div className="px-3 pb-3">
                        <textarea
                            placeholder="Order notes..."
                            value={cart.notes || ''}
                            onChange={(e) => dispatch(setNotes(e.target.value))}
                            className="w-full bg-muted/50 border border-primary/20 rounded-lg p-2 text-foreground placeholder-muted-foreground resize-none h-14 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                        />
                    </div>

                    {/* Discount & Tip Row */}
                    <div className="p-3 grid grid-cols-2 gap-3 border-b border-primary/10">
                        {/* Discount */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                                <Percent className="w-4 h-4" />
                                <span>Discount</span>
                            </div>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={discountInput}
                                    onChange={(e) => setDiscountInput(e.target.value)}
                                    onBlur={applyDiscount}
                                    onKeyDown={(e) => handleInputKeyDown(e, applyDiscount)}
                                    className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-sm focus:outline-none focus:border-primary w-14"
                                />
                                <select
                                    value={discountTypeInput}
                                    onChange={(e) => {
                                        setDiscountTypeInput(e.target.value);
                                        // Auto-apply when type changes if there is a value
                                        if (discountInput) {
                                            const amount = parseFloat(discountInput) || 0;
                                            dispatch(setDiscount({ amount, type: e.target.value }));
                                        }
                                    }}
                                    className="bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-sm focus:outline-none"
                                >
                                    <option value="fixed">₹</option>
                                    <option value="percent">%</option>
                                </select>
                            </div>
                        </div>

                        {/* Tip */}
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                                <Gift className="w-4 h-4" />
                                <span>Tip</span>
                            </div>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={tipInput}
                                    onChange={(e) => setTipInput(e.target.value)}
                                    onBlur={applyTip}
                                    onKeyDown={(e) => handleInputKeyDown(e, applyTip)}
                                    className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-sm focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="p-3 bg-muted/30 space-y-1 border-t border-primary/10">
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground text-sm">
                            <span>Tax</span>
                            <span>{formatCurrency(tax)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-success text-sm">
                                <span>Discount</span>
                                <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        {tipAmount > 0 && (
                            <div className="flex justify-between text-info text-sm">
                                <span>Tip</span>
                                <span>+{formatCurrency(tipAmount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-primary pt-2 border-t border-primary/20 mt-2">
                            <span>Total</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-3 flex gap-3">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            leftIcon={<Send className="w-5 h-5" />}
                            onClick={handleSendToKitchen}
                            isLoading={createOrderMutation.isPending}
                            disabled={cart.items.length === 0 || orderSent}
                        >
                            {orderSent ? 'Sent' : 'Send'}
                        </Button>
                        <Button
                            variant="accent"
                            size="lg"
                            fullWidth
                            leftIcon={<CreditCard className="w-5 h-5" />}
                            onClick={() => {
                                if (cart.items.length > 0) {
                                    createOrderMutation.mutate(); // Ensure backend is up to date before payment
                                    setShowPaymentModal(true);
                                }
                            }}
                            disabled={cart.items.length === 0 || !orderSent}
                        >
                            Payment
                        </Button>
                    </div>
                </div>
            </div>

            {/* Category Filter Popup */}
            <Modal
                isOpen={showCategoryPopup}
                onClose={() => setShowCategoryPopup(false)}
                title="Filter by Category"
                size="md"
            >
                <div className="space-y-2 max-h-[400px] overflow-auto">
                    <button
                        onClick={() => {
                            setSelectedCategory('all');
                            setShowCategoryPopup(false);
                        }}
                        className={`w-full p-2 text-left rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'bg-primary/5 hover:bg-primary/10 text-primary'
                            }`}
                    >
                        All Categories
                    </button>
                    {categories?.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                setSelectedCategory(category.id);
                                setShowCategoryPopup(false);
                            }}
                            className={`w-full p-2 text-left rounded-lg transition-colors flex items-center gap-3 ${selectedCategory === category.id
                                ? 'text-white shadow-md'
                                : 'bg-muted hover:bg-muted/80 text-foreground'
                                }`}
                            style={selectedCategory === category.id ? { backgroundColor: category.color } : {}}
                        >
                            <span
                                className={`w-3 h-3 rounded-full ${selectedCategory === category.id ? 'bg-white' : ''}`}
                                style={selectedCategory !== category.id ? { backgroundColor: category.color } : {}}
                            />
                            {category.name}
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Table Selection Modal */}
            <Modal
                isOpen={showTableModal}
                onClose={() => setShowTableModal(false)}
                title="Select Table"
                size="lg"
            >
                <div className="space-y-4 max-h-[500px] overflow-auto">
                    {floors?.map((floor) => (
                        <div key={floor.id}>
                            <h4 className="text-sm font-medium text-gray-400 mb-2">{floor.name}</h4>
                            <div className="grid grid-cols-4 gap-2">
                                {floor.tables?.filter(t => t.isActive).map((table) => (
                                    <button
                                        key={table.id}
                                        onClick={() => handleTableSelect(table)}
                                        className={`p-3 rounded-lg text-center transition-colors ${cart.tableId === table.id
                                            ? 'bg-primary/20 border border-primary text-primary-light'
                                            : table.currentOccupancy > 0
                                                ? 'bg-danger/20 border border-danger/50 text-danger'
                                                : 'bg-muted hover:bg-muted/80 text-foreground border border-border'
                                            }`}
                                    >
                                        <span className="font-medium">{table.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {(!floors || floors.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                            No floors configured
                        </div>
                    )}
                </div>
            </Modal>

            {/* Customer Selection Modal */}
            <Modal
                isOpen={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                title="Select Customer"
                size="lg"
            >
                <div className="space-y-2 max-h-96 overflow-auto">
                    <button
                        onClick={() => {
                            dispatch(setCustomer(undefined));
                            setShowCustomerModal(false);
                        }}
                        className="w-full p-3 text-left bg-muted rounded-lg hover:bg-muted/80 text-muted-foreground"
                    >
                        No Customer (Walk-in)
                    </button>
                    {customers?.map((customer) => (
                        <button
                            key={customer.id}
                            onClick={() => {
                                dispatch(setCustomer({ id: customer.id, name: customer.name, email: customer.email }));
                                setShowCustomerModal(false);
                            }}
                            className={`w-full p-3 text-left rounded-lg transition-colors ${cart.customerId === customer.id
                                ? 'bg-primary/20 border border-primary'
                                : 'bg-muted hover:bg-muted/80'
                                }`}
                        >
                            <div className="font-medium text-foreground">{customer.name}</div>
                            <div className="text-sm text-gray-400">
                                {customer.email || customer.phone || 'No contact info'}
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                total={total}
                shopId={shopId}
                sessionId={sessionId}
                orderId={cart.orderId}
                onSuccess={handlePaymentSuccess}
            />
            {/* Error Modal */}
            <Modal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                title="Order Failed"
            >
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center">
                        <X className="w-8 h-8 text-danger" />
                    </div>
                    <p className="text-center text-foreground text-lg font-medium">
                        {errorMessage}
                    </p>
                    <Button
                        onClick={() => setShowErrorModal(false)}
                        fullWidth
                    >
                        Okay, I'll select another table
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default RegisterView;
