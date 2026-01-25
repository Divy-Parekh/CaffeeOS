import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Dropdown = ({
    trigger,
    items,
    onSelect,
    align = 'right',
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        // Use capture phase to catch clicks before they're stopped
        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className={`
              absolute z-50 mt-2 min-w-[180px]
              bg-popover border border-border rounded-lg shadow-xl overflow-hidden
              ${align === 'right' ? 'right-0' : 'left-0'}
            `}
                    >
                        {items.map((item, index) => (
                            <button
                                key={item.value}
                                onClick={() => {
                                    if (!item.disabled) {
                                        onSelect(item.value);
                                        setIsOpen(false);
                                    }
                                }}
                                disabled={item.disabled}
                                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-colors
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
                  ${item.danger ? 'text-danger hover:bg-danger/10' : 'text-foreground'}
                  ${index !== items.length - 1 ? 'border-b border-border' : ''}
                `}
                            >
                                {item.icon && <span className="text-muted-foreground">{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Select Dropdown (for forms)
export const Select = ({
    label,
    value,
    onChange,
    options,
    placeholder = 'Select...',
    error,
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef(null);

    const selectedOption = options.find((opt) => opt.value === value);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (isOpen && selectRef.current && !selectRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        // Use capture phase to catch clicks before they're stopped
        document.addEventListener('click', handleClick, true);
        return () => document.removeEventListener('click', handleClick, true);
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {label}
                </label>
            )}
            <div ref={selectRef} className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={`
            w-full bg-background border border-border rounded-lg
            px-4 py-3 text-left flex items-center justify-between
            focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger' : ''}
          `}
                >
                    <span className={selectedOption ? 'text-foreground' : 'text-muted-foreground'}>
                        {selectedOption?.label || placeholder}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-60 overflow-auto"
                        >
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full px-4 py-3 text-left text-foreground hover:bg-muted transition-colors
                    ${option.value === value ? 'bg-primary/20 text-primary' : ''}
                  `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </div>
    );
};

export default Dropdown;
