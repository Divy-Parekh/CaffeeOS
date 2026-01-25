import React from 'react';

const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
};

export const Card = ({
    children,
    className = '',
    onClick,
    hover = false,
    padding = 'md',
}) => {
    return (
        <div
            onClick={onClick}
            className={`
        bg-dark-800 rounded-xl border border-dark-600
        ${paddingStyles[padding]}
        ${hover ? 'hover:border-primary/50 hover:bg-dark-700 cursor-pointer transition-all' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({
    children,
    className = '',
}) => (
    <div className={`border-b border-dark-600 pb-3 mb-3 ${className}`}>
        {children}
    </div>
);

export const CardTitle = ({
    children,
    className = '',
}) => (
    <h3 className={`text-lg font-semibold text-foreground ${className}`}>{children}</h3>
);

export const CardContent = ({
    children,
    className = '',
}) => <div className={className}>{children}</div>;

export const CardFooter = ({
    children,
    className = '',
}) => (
    <div className={`border-t border-border pt-3 mt-3 ${className}`}>
        {children}
    </div>
);

export default Card;
