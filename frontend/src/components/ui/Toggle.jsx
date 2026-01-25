import React from 'react';

const sizeStyles = {
    sm: { toggle: 'w-8 h-5', dot: 'w-3 h-3', translate: 'translate-x-3.5' },
    md: { toggle: 'w-11 h-6', dot: 'w-4 h-4', translate: 'translate-x-5' },
    lg: { toggle: 'w-14 h-8', dot: 'w-6 h-6', translate: 'translate-x-6' },
};

export const Toggle = ({
    checked,
    onChange,
    label,
    disabled = false,
    size = 'md',
}) => {
    const styles = sizeStyles[size];

    return (
        <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <div
                role="switch"
                aria-checked={checked}
                onClick={() => !disabled && onChange(!checked)}
                className={`
          relative inline-flex items-center rounded-xl border-2
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-900
          ${styles.toggle}
          ${checked ? 'bg-primary border-primary' : 'bg-dark-700 border-dark-600 hover:border-dark-500'}
        `}
            >
                <span
                    className={`
            inline-block rounded-lg shadow-sm transform
            transition-all duration-300 ease-out flex items-center justify-center
            ${styles.dot}
            ${checked ? 'bg-white' : 'bg-gray-400'}
            ${checked ? styles.translate : 'translate-x-1'}
          `}
                />
            </div>
            {label && <span className="text-white font-medium select-none">{label}</span>}
        </label>
    );
};

export default Toggle;
