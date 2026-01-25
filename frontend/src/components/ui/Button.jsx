import React from 'react';
import { Loader2 } from 'lucide-react';

const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    secondary: 'bg-primary/10 hover:bg-primary/20 text-primary',
    accent: 'bg-accent hover:bg-accent/80 text-accent-foreground',
    danger: 'bg-danger hover:bg-danger/90 text-white',
    ghost: 'bg-transparent hover:bg-primary/10 text-primary',
    outline: 'bg-transparent border-2 border-primary hover:bg-primary hover:text-primary-foreground text-primary',
};

const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[52px]',
    xl: 'px-8 py-4 text-xl min-h-[60px]',
};

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-150 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
                    {children}
                    {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
                </>
            )}
        </button>
    );
};

export default Button;
