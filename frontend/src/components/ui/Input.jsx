import React, { forwardRef } from 'react';

export const Input = forwardRef(
    ({ label, error, leftIcon, rightIcon, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full bg-background border border-border rounded-lg
              px-4 py-3 text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-danger' : ''}
              ${className}
            `}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-danger">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
