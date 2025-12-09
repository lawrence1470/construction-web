'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gray-900 text-gray-50 hover:bg-gray-900/90':
              variant === 'default',
            'border border-gray-200 bg-white hover:bg-gray-100 hover:text-gray-900':
              variant === 'outline',
            'hover:bg-gray-100 hover:text-gray-900': variant === 'ghost',
            'bg-red-500 text-gray-50 hover:bg-red-500/90':
              variant === 'destructive',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-xl px-3': size === 'sm',
            'h-11 rounded-xl px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
