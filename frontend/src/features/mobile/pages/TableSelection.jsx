import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, MapPin, ChevronRight, Store } from 'lucide-react';
import { mobileApi } from '../../../services/api';

const TableSelection = () => {
    const { shopId } = useParams();
    const navigate = useNavigate();

    const { data: shop, isLoading, error } = useQuery({
        queryKey: ['shop-tables', shopId],
        queryFn: async () => {
            const response = await mobileApi.getShopTables(shopId);
            return response.data.data;
        },
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading tables...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <Store className="w-16 h-16 text-gray-300 mb-4" />
                <h1 className="text-xl font-bold text-gray-900 mb-2">Shop Not Found</h1>
                <p className="text-gray-500 max-w-xs mx-auto">
                    {error.response?.data?.message || 'We could not find the shop you are looking for.'}
                </p>
            </div>
        );
    }

    const { name, logo, themeColor, floors, address } = shop;

    return (
        <div className="min-h-screen bg-gray-50 pb-safe">
            {/* Header */}
            <div
                className="bg-white px-6 py-8 pb-12 rounded-b-[2.5rem] shadow-sm relative overflow-hidden"
                style={{ backgroundColor: themeColor || '#4F46E5' }}
            >
                <div className="absolute inset-0 bg-black/10"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    {logo ? (
                        <div className="w-20 h-20 bg-white rounded-full p-1 mb-4 shadow-lg">
                            <img
                                src={logo}
                                alt={name}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                            <Store className="w-10 h-10 text-white" />
                        </div>
                    )}

                    <h1 className="text-2xl font-bold text-white mb-2">{name}</h1>
                    {address && (
                        <div className="flex items-center gap-1.5 text-white/80 text-sm">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{address}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 -mt-6 relative z-20 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Your Table</h2>
                    <p className="text-sm text-gray-500">Please choose where you are seated</p>
                </div>

                {floors.map((floor) => (
                    <div key={floor.id} className="space-y-3">
                        <h3 className="uppercase text-xs font-bold text-gray-400 tracking-wider px-2">
                            {floor.name}
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {floor.tables.map((table) => (
                                <motion.button
                                    key={table.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate(`/m/${table.token}`)}
                                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group active:border-primary active:ring-1 active:ring-primary/20 transition-all"
                                >
                                    <span className="font-semibold text-gray-900">{table.name}</span>
                                    <div
                                        className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-active:bg-primary/10 transition-colors"
                                        style={{ color: themeColor || '#4F46E5' }}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ))}

                {floors.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <p>No tables available</p>
                    </div>
                )}
            </div>

            <div className="text-center py-8 text-xs text-gray-400">
                Powered by CaffeeOS
            </div>
        </div>
    );
};

export default TableSelection;
