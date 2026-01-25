import React from 'react';
import { Loader2 } from 'lucide-react';

const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
};

export const Spinner = ({ size = 'md', className = '' }) => {
    return (
        <Loader2 className={`animate-spin text-primary ${sizeStyles[size]} ${className}`} />
    );
};

export const LoadingOverlay = ({ message }) => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-900/80 backdrop-blur-sm">
            <Spinner size="xl" />
            {message && <p className="mt-4 text-lg text-gray-300">{message}</p>}
        </div>
    );
};

export const LoadingCard = ({ message = 'Loading...' }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">{message}</p>
        </div>
    );
};

export default Spinner;
