import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Filter, Trash2, ChevronDown, Check, X } from 'lucide-react';
import { Button, Input, Badge, LoadingCard } from '../../../components/ui';
import { productApi, categoryApi } from '../../../services/api';
import { useDebounce } from '../../../hooks/useDebounce';

import { formatCurrency } from '../../../utils/format';

const ProductList = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchInput, setSearchInput] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // Debounce search input to prevent refetch on every keystroke
    const debouncedSearch = useDebounce(searchInput, 300);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch all products (global) with debounced search
    const { data: products, isLoading } = useQuery({
        queryKey: ['products', categoryFilter, debouncedSearch],
        queryFn: async () => {
            const params = {};
            if (categoryFilter !== 'all') params.categoryId = categoryFilter;
            if (debouncedSearch) params.search = debouncedSearch;
            const response = await productApi.getAll(params);
            return response.data.data;
        },
    });

    // Fetch all categories (global)
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await categoryApi.getAll();
            return response.data.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => productApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });

    const selectedCategory = categories?.find(c => c.id === categoryFilter);

    if (isLoading) {
        return <LoadingCard message="Loading products..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Products</h1>
                <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => navigate('/products/new')}>
                    Add Product
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 max-w-md">
                    <Input
                        placeholder="Search products..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        leftIcon={<Search className="w-5 h-5" />}
                    />
                </div>

                {/* Category Filter Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="flex items-center gap-2 px-4 py-3 bg-secondary border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">
                            {categoryFilter === 'all' ? 'All Categories' : selectedCategory?.name || 'Category'}
                        </span>
                        {categoryFilter !== 'all' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: selectedCategory?.color }}
                            />
                        )}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showCategoryDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setCategoryFilter('all');
                                        setShowCategoryDropdown(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${categoryFilter === 'all'
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted text-foreground'
                                        }`}
                                >
                                    <span>All Categories</span>
                                    {categoryFilter === 'all' && <Check className="w-4 h-4" />}
                                </button>

                                <div className="my-2 h-px bg-border" />

                                {categories?.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setCategoryFilter(cat.id);
                                            setShowCategoryDropdown(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${categoryFilter === cat.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-muted text-foreground'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span>{cat.name}</span>
                                        </div>
                                        {categoryFilter === cat.id && <Check className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Clear filter button */}
                {categoryFilter !== 'all' && (
                    <button
                        onClick={() => setCategoryFilter('all')}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                        Clear
                    </button>
                )}
            </div>

            {/* Products Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Sale Price</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Tax</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">UOM</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                            <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {products?.map((product) => (
                            <tr
                                key={product.id}
                                onClick={() => navigate(`/products/${product.id}`)}
                                className="hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-10 h-10 rounded-lg object-cover bg-secondary"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                                                <span className="text-lg text-muted-foreground">{product.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <span className="font-medium text-foreground">{product.name}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right font-semibold text-foreground">
                                    {formatCurrency(product.basePrice)}
                                </td>
                                <td className="px-4 py-4 text-right text-muted-foreground">{product.taxPercent}%</td>
                                <td className="px-4 py-4 text-muted-foreground">{product.uom}</td>
                                <td className="px-4 py-4">
                                    <Badge
                                        variant="default"
                                        size="sm"
                                        className="text-white font-medium shadow-sm border-0"
                                        style={{ backgroundColor: product.category?.color || '#374151' }}
                                    >
                                        {product.category?.name}
                                    </Badge>
                                </td>
                                <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => deleteMutation.mutate(product.id)}
                                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-danger transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No products found
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductList;
