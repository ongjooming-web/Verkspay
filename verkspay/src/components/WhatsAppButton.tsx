import Link from 'next/link'

interface WhatsAppButtonProps {
  href: string
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'button' | 'icon'
  disabled?: boolean
}

export function WhatsAppButton({
  href,
  label = 'WhatsApp',
  size = 'md',
  variant = 'button',
  disabled = false
}: WhatsAppButtonProps) {
  if (!href || disabled) {
    return (
      <button
        disabled
        className={`
          ${variant === 'button' ? 'px-4 py-2 rounded-lg font-medium text-white' : 'text-2xl'}
          ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          bg-gray-600 hover:bg-gray-700
          transition
        `}
      >
        {variant === 'button' ? (
          <>
            <span className="mr-2">💬</span>
            {label}
          </>
        ) : (
          '💬'
        )}
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green-400 hover:text-green-300 transition text-2xl"
        title="Send via WhatsApp"
      >
        💬
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-2
        px-4 py-2 rounded-lg font-medium
        bg-green-600 hover:bg-green-700 text-white
        transition
        ${size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'}
      `}
    >
      <span>💬</span>
      {label}
    </a>
  )
}
