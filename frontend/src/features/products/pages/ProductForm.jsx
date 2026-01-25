import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button, Input, Card, Tabs, Select, LoadingCard, Badge } from '../../../components/ui';
import { productApi, categoryApi } from '../../../services/api';
import { useAppSelector } from '../../../hooks/useRedux';
import { formatCurrency } from '../../../utils/format';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isExisting = !!id;
    const currentShop = useAppSelector((state) => state.session.currentShop);
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isEditMode, setIsEditMode] = useState(!isExisting);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        basePrice: '',
        taxPercent: '0',
        uom: 'unit',
        categoryId: '',
    });

    const [variants, setVariants] = useState([]);

    // Fetch product if viewing/editing existing
    const { data: product, isLoading: productLoading } = useQuery({
        queryKey: ['product', id],
        queryFn: async () => {
            const response = await productApi.getById(id);
            return response.data.data;
        },
        enabled: isExisting,
    });

    // Fetch categories (global)
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await categoryApi.getAll();
            return response.data.data;
        },
    });

    // Populate form when viewing/editing existing product
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                description: product.description || '',
                basePrice: product.basePrice.toString(),
                taxPercent: product.taxPercent.toString(),
                uom: product.uom,
                categoryId: product.categoryId,
            });
            setImagePreview(product.image || null);
            setVariants(product.variants.map((v) => ({
                attribute: v.attribute,
                value: v.value,
                unit: v.unit || '',
                extraPrice: v.extraPrice,
            })));
        }
    }, [product]);

    // Create/Update mutation - sends FormData to backend
    const saveMutation = useMutation({
        mutationFn: async () => {
            const formPayload = new FormData();
            formPayload.append('name', formData.name);
            formPayload.append('description', formData.description);
            formPayload.append('basePrice', formData.basePrice);
            formPayload.append('taxPercent', formData.taxPercent);
            formPayload.append('uom', formData.uom);
            formPayload.append('categoryId', formData.categoryId);
            formPayload.append('shopId', currentShop?.id || '');
            formPayload.append('variants', JSON.stringify(variants));

            if (imageFile) {
                formPayload.append('image', imageFile);
            }

            if (isExisting) {
                return productApi.update(id, formPayload);
            }
            return productApi.create(formPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['product', id] });
            if (isExisting) {
                setIsEditMode(false);
                setImageFile(null);
            } else {
                navigate('/products');
            }
        },
    });

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            // Show preview immediately
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const addVariant = () => {
        setVariants([...variants, { attribute: '', value: '', unit: '', extraPrice: 0 }]);
    };

    const updateVariant = (index, field, value) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        setVariants(updated);
    };

    const removeVariant = (index) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const handleEditClick = () => {
        setIsEditMode(true);
    };

    const handleCancelEdit = () => {
        if (isExisting) {
            if (product) {
                setFormData({
                    name: product.name,
                    description: product.description || '',
                    basePrice: product.basePrice.toString(),
                    taxPercent: product.taxPercent.toString(),
                    uom: product.uom,
                    categoryId: product.categoryId,
                });
                setImagePreview(product.image || null);
                setImageFile(null);
                setVariants(product.variants.map((v) => ({
                    attribute: v.attribute,
                    value: v.value,
                    unit: v.unit || '',
                    extraPrice: v.extraPrice,
                })));
            }
            setIsEditMode(false);
        } else {
            navigate('/products');
        }
    };

    if (isExisting && productLoading) {
        return <LoadingCard message="Loading product..." />;
    }

    const selectedCategory = categories?.find(c => c.id === formData.categoryId);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/products')}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-foreground">
                        {isExisting ? (isEditMode ? 'Edit Product' : 'Product Details') : 'Add Product'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    {isEditMode ? (
                        <>
                            <Button variant="ghost" onClick={handleCancelEdit}>
                                {isExisting ? 'Cancel' : 'Discard'}
                            </Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                isLoading={saveMutation.isPending}
                                disabled={!formData.name || !formData.categoryId || !formData.basePrice}
                            >
                                {isExisting ? 'Apply' : 'Save'}
                            </Button>
                        </>
                    ) : (
                        <Button leftIcon={<Edit2 className="w-4 h-4" />} onClick={handleEditClick}>
                            Edit
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left: Form/View */}
                <div className="col-span-2">
                    <Card padding="lg">
                        {/* Product Name */}
                        {isEditMode ? (
                            <Input
                                label="Product Name"
                                placeholder="Enter product name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mb-4"
                            />
                        ) : (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Product Name</label>
                                <p className="text-lg font-semibold text-foreground">{formData.name}</p>
                            </div>
                        )}

                        {/* Image Upload/View */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Image</label>
                            <div className="flex gap-4">
                                {isEditMode && (
                                    <label className="flex-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground">Click to upload image</p>
                                    </label>
                                )}
                                {imagePreview && (
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className={`${isEditMode ? 'w-32 h-32' : 'w-48 h-48'} object-cover rounded-xl bg-secondary`}
                                    />
                                )}
                                {!imagePreview && !isEditMode && (
                                    <div className="w-48 h-48 bg-secondary rounded-xl flex items-center justify-center">
                                        <span className="text-4xl text-muted-foreground">{formData.name?.charAt(0) || '?'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs
                            tabs={[
                                { id: 'general', label: 'General Info' },
                                { id: 'variants', label: `Variants (${variants.length})` },
                            ]}
                            activeTab={activeTab}
                            onChange={setActiveTab}
                            variant="underline"
                        />

                        <div className="mt-6">
                            {activeTab === 'general' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {isEditMode ? (
                                        <>
                                            <Select
                                                label="Category"
                                                value={formData.categoryId}
                                                onChange={(value) => setFormData({ ...formData, categoryId: value })}
                                                options={categories?.map((c) => ({ label: c.name, value: c.id })) || []}
                                                placeholder="Select category"
                                            />
                                            <Input
                                                label="Sale Price"
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.basePrice}
                                                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                                            />
                                            <Select
                                                label="Unit of Measure"
                                                value={formData.uom}
                                                onChange={(value) => setFormData({ ...formData, uom: value })}
                                                options={[
                                                    { label: 'Unit', value: 'unit' },
                                                    { label: 'Kg', value: 'kg' },
                                                    { label: 'Litre', value: 'litre' },
                                                    { label: 'Gram', value: 'gram' },
                                                ]}
                                            />
                                            <Input
                                                label="Tax (%)"
                                                type="number"
                                                placeholder="0"
                                                value={formData.taxPercent}
                                                onChange={(e) => setFormData({ ...formData, taxPercent: e.target.value })}
                                            />
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                                                    Description
                                                </label>
                                                <textarea
                                                    placeholder="Product description..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    className="w-full bg-secondary border border-border rounded-lg p-3 text-foreground placeholder-muted-foreground resize-none h-24 focus:outline-none focus:border-primary"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
                                                <Badge
                                                    variant="default"
                                                    className="text-white font-medium shadow-sm border-0"
                                                    style={{ backgroundColor: selectedCategory?.color || '#374151' }}
                                                >
                                                    {selectedCategory?.name || 'N/A'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Sale Price</label>
                                                <p className="text-xl font-bold text-primary">{formatCurrency(parseFloat(formData.basePrice) || 0)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Unit of Measure</label>
                                                <p className="text-foreground capitalize">{formData.uom}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Tax</label>
                                                <p className="text-foreground">{formData.taxPercent}%</p>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                                                <p className="text-foreground">{formData.description || 'No description'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeTab === 'variants' && (
                                <div>
                                    {isEditMode && (
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-muted-foreground">Add product variants like sizes or extras</p>
                                            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={addVariant}>
                                                Add Row
                                            </Button>
                                        </div>
                                    )}

                                    <div className="bg-secondary rounded-xl overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Attribute</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Value</th>
                                                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Unit</th>
                                                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Extra Price</th>
                                                    {isEditMode && <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {variants.map((variant, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3">
                                                            {isEditMode ? (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Size"
                                                                    value={variant.attribute}
                                                                    onChange={(e) => updateVariant(idx, 'attribute', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-border py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                                                                />
                                                            ) : (
                                                                <span className="text-foreground">{variant.attribute}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isEditMode ? (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Large"
                                                                    value={variant.value}
                                                                    onChange={(e) => updateVariant(idx, 'value', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-border py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                                                                />
                                                            ) : (
                                                                <span className="text-foreground">{variant.value}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {isEditMode ? (
                                                                <input
                                                                    type="text"
                                                                    placeholder="ml"
                                                                    value={variant.unit || ''}
                                                                    onChange={(e) => updateVariant(idx, 'unit', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-border py-1 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                                                                />
                                                            ) : (
                                                                <span className="text-muted-foreground">{variant.unit || '-'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {isEditMode ? (
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={variant.extraPrice}
                                                                    onChange={(e) => updateVariant(idx, 'extraPrice', parseFloat(e.target.value) || 0)}
                                                                    className="w-full bg-transparent border-b border-border py-1 text-foreground text-right placeholder-muted-foreground focus:outline-none focus:border-primary"
                                                                />
                                                            ) : (
                                                                <span className="text-foreground">{formatCurrency(variant.extraPrice)}</span>
                                                            )}
                                                        </td>
                                                        {isEditMode && (
                                                            <td className="px-4 py-3 text-right">
                                                                <button
                                                                    onClick={() => removeVariant(idx)}
                                                                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-danger"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {variants.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                {isEditMode ? 'No variants. Click "Add Row" to add one.' : 'No variants'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Right: Preview */}
                <div>
                    <Card padding="lg">
                        <h3 className="font-semibold text-foreground mb-4">Preview</h3>
                        <div className="bg-secondary rounded-xl p-4 text-center">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full aspect-square object-cover rounded-lg mb-3"
                                />
                            ) : (
                                <div className="w-full aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center">
                                    <span className="text-4xl text-muted-foreground">
                                        {formData.name?.charAt(0) || '?'}
                                    </span>
                                </div>
                            )}
                            <h4 className="font-medium text-foreground">{formData.name || 'Product Name'}</h4>
                            <p className="text-primary font-semibold">
                                {formatCurrency(parseFloat(formData.basePrice) || 0)}
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;
