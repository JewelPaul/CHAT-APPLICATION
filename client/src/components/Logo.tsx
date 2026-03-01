import { Shield, MessageSquare } from 'lucide-react'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'full' | 'icon'
  className?: string
}

export function Logo({ size = 'medium', variant = 'full', className = '' }: LogoProps) {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl'
  }

  const iconSizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  }

  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <Shield className={`${iconSizeClasses[size]} text-[var(--accent)]`} />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
        <Shield className={`${iconSizeClasses[size]} text-[var(--accent)]`} />
        <MessageSquare className="absolute bottom-0 right-0 w-3.5 h-3.5 text-[var(--accent)] translate-x-1 translate-y-1" />
      </div>
      <div className="flex flex-col">
        <h1 className={`font-bold text-[var(--text-primary)] ${sizeClasses[size]} leading-none tracking-tight`}>
          ChatWave
        </h1>
        {size !== 'small' && (
          <p className="text-xs text-[var(--text-muted)] font-medium tracking-wide mt-0.5">
            Ephemeral · Encrypted
          </p>
        )}
      </div>
    </div>
  )
}