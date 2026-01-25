import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, LoadingCard } from '../../../components/ui';
import { floorApi } from '../../../services/api';
import { useAppDispatch } from '../../../hooks/useRedux';
import { setTable } from '../../../store/cartSlice';

const TableView = () => {
    const { shopId, sessionId } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [selectedFloor, setSelectedFloor] = useState('');

    // Fetch floors with tables
    const { data: floors, isLoading } = useQuery({
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

    const currentFloor = floors?.find((f) => f.id === selectedFloor);

    const handleTableClick = (table) => {
        dispatch(setTable({ id: table.id, name: table.name }));
        navigate(`/pos/${shopId}/${sessionId}/register`);
    };

    const getTableStatus = (table) => {
        if (table.currentOccupancy > 0) {
            return 'occupied';
        }
        return 'free';
    };

    if (isLoading) {
        return <LoadingCard message="Loading floor plan..." />;
    }

    return (
        <div className="h-full flex flex-col p-4">
            {/* Floor Selector */}
            <div className="mb-6 max-w-xs">
                <Select
                    label="Floor"
                    value={selectedFloor}
                    onChange={setSelectedFloor}
                    options={floors?.map((f) => ({ label: f.name, value: f.id })) || []}
                    placeholder="Select floor"
                />
            </div>

            {/* Floor Plan Header */}
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Floor View</h2>
                <p className="text-muted-foreground text-sm">
                    {currentFloor?.tables.length || 0} tables on {currentFloor?.name || 'this floor'}
                </p>
            </div>

            {/* Tables Grid */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {currentFloor?.tables
                        .filter((t) => t.isActive)
                        .map((table, index) => {
                            const status = getTableStatus(table);

                            return (
                                <motion.button
                                    key={table.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleTableClick(table)}
                                    className={`
                    aspect-square rounded-xl border-2 p-4
                    flex flex-col items-center justify-center gap-2
                    transition-all cursor-pointer shadow-sm
                    ${status === 'occupied'
                                            ? 'bg-danger/10 border-danger/30'
                                            : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                                        }
                  `}
                                >
                                    <span className="text-2xl font-bold text-foreground">{table.name}</span>
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                        <Users className="w-4 h-4" />
                                        <span>
                                            {table.currentOccupancy}/{table.capacity}
                                        </span>
                                    </div>
                                    <span className={`text-xs ${status === 'occupied' ? 'text-danger' : 'text-success'}`}>
                                        {status === 'occupied' ? 'Occupied' : 'Available'}
                                    </span>
                                </motion.button>
                            );
                        })}
                </div>

                {/* Empty State */}
                {currentFloor?.tables.filter((t) => t.isActive).length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No tables</h3>
                        <p className="text-muted-foreground">Add tables in Settings → Floor Plan</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-card border border-success rounded"></div>
                    <span className="text-sm text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-danger/20 border border-danger rounded"></div>
                    <span className="text-sm text-muted-foreground">Occupied</span>
                </div>
            </div>
        </div>
    );
};

export default TableView;
