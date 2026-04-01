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
          'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-400/50 hover:scale-105 active:scale-95 shadow-lg shadow-blue-400/30': variant === 'primary',
          'glass text-blue-900 hover:bg-blue-50 hover:border-blue-200 active:scale-95': variant === 'secondary',
          'glass text-blue-700 hover:bg-blue-50 hover:border-blue-300 active:scale-95 border border-blue-200': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
