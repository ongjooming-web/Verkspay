import React from 'react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  className,
  children,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'font-medium rounded-lg transition-all duration-300 cursor-pointer',
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        {
          'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/50 hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/30': variant === 'primary',
          'glass text-white hover:bg-white/15 hover:border-white/30 active:scale-95': variant === 'secondary',
          'glass text-gray-200 hover:bg-white/10 hover:border-white/20 active:scale-95 border border-white/10': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
