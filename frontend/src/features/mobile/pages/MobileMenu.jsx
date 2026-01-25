import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Info, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const MobileMenu = ({ products, categories, cart, onAddToCart, themeColor }) => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredProducts = products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const { tableToken } = useParams();

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border p-4 z-20 shadow-sm">
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search for dishes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-muted/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                </div>

                {/* Categories */}
                <div className="overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar flex gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${selectedCategory === 'all'
                            ? 'text-white shadow-lg shadow-primary/30 transform scale-105'
                            : 'bg-muted text-muted-foreground border border-transparent'
                            }`}
                        style={selectedCategory === 'all' ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                    >
                        All Items
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-all ${selectedCategory === cat.id
                                ? 'text-white shadow-lg shadow-primary/30 transform scale-105'
                                : 'bg-muted text-muted-foreground border border-transparent'
                                }`}
                            style={selectedCategory === cat.id ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="p-4 grid grid-cols-1 gap-4">
                {filteredProducts.map((product) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onAddToCart(product)}
                        className="bg-card rounded-2xl p-3 shadow-sm border border-border flex gap-4 overflow-hidden relative"
                    >
                        <div className="w-28 h-28 bg-muted rounded-xl flex-shrink-0 overflow-hidden relative">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-3xl font-bold">
                                    {product.name.charAt(0)}
                                </div>
                            )}
                            <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-bold text-gray-800">4.8</span>
                            </div>
                        </div>

                        <div className="flex-1 py-1 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-foreground text-lg leading-tight mb-1">{product.name}</h4>
                                <p className="text-muted-foreground text-xs line-clamp-2">{product.description || 'Delicious and freshly prepared'}</p>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                                <div className="text-lg font-bold" style={{ color: themeColor }}>
                                    {formatCurrency(product.basePrice)}
                                </div>

                                <button
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                                    style={{ backgroundColor: `${themeColor}20` }}
                                >
                                    <div className="text-xl font-medium" style={{ color: themeColor }}>+</div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Cart FAB */}
            <AnimatePresence>
                {cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-50"
                    >
                        <button
                            onClick={() => navigate(`/m/${tableToken}/cart`)}
                            className="w-full bg-card text-white p-4 rounded-2xl shadow-xl flex items-center justify-between group active:scale-[0.98] transition-transform"
                            style={{ backgroundColor: themeColor }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="font-bold">{cartCount}</span>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-xs opacity-90">Total</span>
                                    <span className="font-bold text-lg">
                                        {formatCurrency(cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 font-semibold">
                                <span>View Cart</span>
                                <ShoppingCart className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileMenu;
