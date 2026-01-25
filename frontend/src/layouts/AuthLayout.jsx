import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        <span className="text-primary">Caffee</span>OS
                    </h1>
                    <p className="text-muted-foreground mt-2">Point of Sale System</p>
                </div>

                {/* Auth Form Container */}
                <div className="bg-dark-800 border border-dark-600 rounded-xl p-6 shadow-2xl">
                    <Outlet />
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    © 2026 CaffeeOS. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
};

export default AuthLayout;
