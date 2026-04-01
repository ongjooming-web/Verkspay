import React from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline'
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-16px transition-all duration-300',
        {
          'glass hover:shadow-lg hover:border-blue-400/30': variant === 'default',
          'glass-sm': variant === 'outline',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={clsx('p-6 border-b border-white/10', className)} 
      {...props} 
    />
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={clsx('p-6', className)} 
      {...props} 
    />
  )
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={clsx('p-6 border-t border-white/10', className)} 
      {...props} 
    />
  )
}
