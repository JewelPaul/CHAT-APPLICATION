interface AvatarProps {
  src?: string
  alt?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ src, alt, name, size = 'md' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl'
  }

  const initial = name[0]?.toUpperCase() || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    )
  }

  return (
    <div 
      className={`${sizeClasses[size]} avatar`}
      style={{
        background: `linear-gradient(135deg, ${getGradientColors(name)})`
      }}
    >
      {initial}
    </div>
  )
}

// Generate consistent gradient colors based on name
function getGradientColors(name: string): string {
  const gradients = [
    '#5e5ce6, #bf5af2',
    '#0a84ff, #5ac8fa',
    '#30d158, #32ade6',
    '#ff453a, #ff9500',
    '#bf5af2, #ff375f',
    '#5ac8fa, #30d158'
  ]
  
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}
