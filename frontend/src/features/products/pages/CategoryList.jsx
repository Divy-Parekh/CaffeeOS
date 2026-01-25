import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GripVertical, Palette } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Modal, Card, LoadingCard } from '../../../components/ui';
import { categoryApi } from '../../../services/api';

const PRESET_COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

const SortableCategoryRow = ({ category, onColorChange }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl mb-2 shadow-sm"
        >
            <button
                {...attributes}
                {...listeners}
                className="cursor-grab text-muted-foreground hover:text-primary transition-colors"
            >
                <GripVertical className="w-5 h-5" />
            </button>

            <div className="relative">
                <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: category.color }}
                >
                    <Palette className="w-4 h-4 text-white/80" />
                </button>

                {showColorPicker && (
                    <div className="absolute left-0 top-full mt-2 z-10 p-2 bg-dark-700 border border-dark-600 rounded-lg flex gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => {
                                    onColorChange(category.id, color);
                                    setShowColorPicker(false);
                                }}
                                className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <span className="flex-1 font-medium text-foreground">{category.name}</span>
            <span className="text-gray-400 text-sm">#{category.sequence + 1}</span>
        </div>
    );
};

const CategoryList = () => {
    const queryClient = useQueryClient();
    const [showNewModal, setShowNewModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch all categories (global)
    const { data: categories, isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const response = await categoryApi.getAll();
            return (response.data.data).sort((a, b) => a.sequence - b.sequence);
        },
    });

    const createMutation = useMutation({
        mutationFn: (data) =>
            categoryApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setShowNewModal(false);
            setNewName('');
            setNewColor(PRESET_COLORS[0]);
        },
    });

    const resequenceMutation = useMutation({
        mutationFn: (data) =>
            categoryApi.resequence(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });

    const updateColorMutation = useMutation({
        mutationFn: ({ id, color }) =>
            categoryApi.update(id, { color }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id && categories) {
            const oldIndex = categories.findIndex((c) => c.id === active.id);
            const newIndex = categories.findIndex((c) => c.id === over.id);
            const newOrder = arrayMove(categories, oldIndex, newIndex);

            resequenceMutation.mutate({
                categories: newOrder.map((cat, idx) => ({ id: cat.id, sequence: idx })),
            });
        }
    };

    const handleColorChange = (id, color) => {
        updateColorMutation.mutate({ id, color });
    };

    if (isLoading) {
        return <LoadingCard message="Loading categories..." />;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-foreground">Categories</h1>
                <Button leftIcon={<Plus className="w-5 h-5" />} onClick={() => setShowNewModal(true)}>
                    New
                </Button>
            </div>

            <Card padding="lg">
                <p className="text-gray-400 mb-4">Drag to reorder categories. Click color to change.</p>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={categories?.map((c) => c.id) || []}
                        strategy={verticalListSortingStrategy}
                    >
                        {categories?.map((category) => (
                            <SortableCategoryRow
                                key={category.id}
                                category={category}
                                onColorChange={handleColorChange}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {categories?.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No categories. Click "New" to add one.
                    </div>
                )}
            </Card>

            {/* New Category Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                title="New Category"
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => setShowNewModal(false)}>
                            Discard
                        </Button>
                        <Button
                            onClick={() => createMutation.mutate({
                                name: newName,
                                color: newColor,
                            })}
                            isLoading={createMutation.isPending}
                            disabled={!newName.trim()}
                        >
                            Save
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Category Name"
                        placeholder="Enter category name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                        <div className="flex gap-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setNewColor(color)}
                                    className={`w-10 h-10 rounded-lg transition-transform ${newColor === color ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CategoryList;
