import { Shield, Waves } from 'lucide-react'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'full' | 'icon'
  className?: string
}

export function Logo({ size = 'medium', variant = 'full', className = '' }: LogoProps) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-4xl'
  }

  const iconSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <Shield className={`${iconSizeClasses[size]} text-primary-600`} />
        <Waves className={`absolute inset-0 ${iconSizeClasses[size]} text-primary-400 opacity-50 animate-pulse`} />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Shield className={`${iconSizeClasses[size]} text-primary-600`} />
        <Waves className={`absolute inset-0 ${iconSizeClasses[size]} text-primary-400 opacity-50 animate-pulse`} />
      </div>
      <div className="flex flex-col">
        <h1 className={`font-bold text-gradient ${sizeClasses[size]} leading-none`}>
          ChatWave
        </h1>
        {size !== 'small' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Ephemeral Secure Chat
          </p>
        )}
      </div>
    </div>
  )
}