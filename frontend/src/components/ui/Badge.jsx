import React from 'react';

const variantStyles = {
    default: 'bg-muted text-muted-foreground border border-border',
    primary: 'bg-primary/20 text-primary-light border border-primary/30',
    accent: 'bg-accent/20 text-accent-light border border-accent/30',
    warning: 'bg-warning/20 text-warning border border-warning/30',
    danger: 'bg-danger/20 text-danger border border-danger/30',
    success: 'bg-success/20 text-success border border-success/30',
};

const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
};

export const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    return (
        <span
            className={`
        inline-flex items-center font-medium rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
        >
            {children}
        </span>
    );
};

export default Badge;
