import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui';
import { Store, ChevronRight } from 'lucide-react';

const MobileSplash = ({ shop, onEnter }) => {
    const themeColor = shop?.themeColor || '#4F46E5';

    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-8 relative overflow-hidden bg-background">
            {/* Background Gradient */}
            <div
                className="absolute inset-0 opacity-20"
                style={{
                    background: `
                        radial-gradient(circle at 50% 0%, ${themeColor}, transparent 50%),
                        radial-gradient(circle at 50% 100%, ${themeColor}, transparent 50%)
                    `
                }}
            />

            <div className="flex-1 flex flex-col items-center justify-center w-full z-10">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-32 h-32 rounded-full bg-card p-2 shadow-2xl mb-8 flex items-center justify-center border border-border"
                >
                    {shop?.logo ? (
                        <img
                            src={shop.logo}
                            alt={shop.name}
                            className="w-full h-full object-cover rounded-full"
                        />
                    ) : (
                        <Store className="w-16 h-16" style={{ color: themeColor }} />
                    )}
                </motion.div>

                <motion.h1
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl font-bold text-foreground text-center mb-3"
                >
                    {shop?.name}
                </motion.h1>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground text-lg"
                >
                    Discover our menu & order
                </motion.p>
            </div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full z-10"
            >
                <Button
                    size="xl"
                    fullWidth
                    onClick={onEnter}
                    style={{ backgroundColor: themeColor }}
                    className="shadow-xl shadow-primary/20 h-16 text-lg rounded-2xl group text-white"
                >
                    <span className="mr-2">View Menu</span>
                    <ChevronRight className="w-5 h-5 group-active:translate-x-1 transition-transform" />
                </Button>
            </motion.div>
        </div>
    );
};

export default MobileSplash;
