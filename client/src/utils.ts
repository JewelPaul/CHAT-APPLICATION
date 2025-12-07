// Generate a random user code
export function generateUserCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

// Detect device name from user agent
export function detectDevice(): string {
  const ua = navigator.userAgent
  
  if (ua.includes('Mac')) return 'Mac'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('iPhone')) return 'iPhone'
  if (ua.includes('iPad')) return 'iPad'
  if (ua.includes('Android')) return 'Android'
  
  return 'Unknown Device'
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format time relative to now
export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return true
  }
}

// Convert file to base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]) // Remove data:mime;base64, prefix
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = error => reject(error)
  })
}

// Validate file for upload
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Size limits based on type
  const maxSizes = {
    image: 5 * 1024 * 1024,      // 5MB for images
    video: 10 * 1024 * 1024,     // 10MB for videos
    audio: 5 * 1024 * 1024,      // 5MB for audio
    document: 10 * 1024 * 1024   // 10MB for documents
  }
  
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Videos
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
    // Documents
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type ${file.type || 'unknown'} not supported. Allowed: images, short videos, audio, PDF, and common documents.` 
    }
  }
  
  // Determine max size based on type
  let maxSize = maxSizes.document
  if (file.type.startsWith('image/')) {
    maxSize = maxSizes.image
  } else if (file.type.startsWith('video/')) {
    maxSize = maxSizes.video
  } else if (file.type.startsWith('audio/')) {
    maxSize = maxSizes.audio
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }
  
  // Check filename length
  if (file.name.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' }
  }
  
  return { valid: true }
}

// Theme management
export function setTheme(theme: 'light' | 'dark' | 'system') {
  localStorage.setItem('theme', theme)
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', systemTheme === 'dark')
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

export function getTheme(): 'light' | 'dark' | 'system' {
  return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system'
}

export function initTheme() {
  const theme = getTheme()
  setTheme(theme)
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') {
      setTheme('system')
    }
  })
}