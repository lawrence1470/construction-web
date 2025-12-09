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
          'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white dark:ring-offset-[var(--bg-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 dark:focus-visible:ring-[var(--accent-purple)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gray-900 dark:bg-[var(--accent-purple)] text-gray-50 dark:text-white hover:bg-gray-900/90 dark:hover:bg-[var(--accent-purple)]/90':
              variant === 'default',
            'border border-gray-200 dark:border-[var(--border-color)] bg-white dark:bg-[var(--bg-input)] hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] hover:text-gray-900 dark:hover:text-[var(--text-primary)] text-gray-900 dark:text-[var(--text-primary)]':
              variant === 'outline',
            'hover:bg-gray-100 dark:hover:bg-[var(--bg-hover)] hover:text-gray-900 dark:hover:text-[var(--text-primary)] dark:text-[var(--text-primary)]': variant === 'ghost',
            'bg-red-500 dark:bg-[var(--accent-red)] text-gray-50 dark:text-white hover:bg-red-500/90 dark:hover:bg-[var(--accent-red)]/90':
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
