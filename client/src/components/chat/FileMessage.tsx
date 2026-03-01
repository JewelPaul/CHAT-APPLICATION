import { Download } from 'lucide-react'

interface FileMessageProps {
  filename: string
  size?: number
  mimeType?: string
  onDownload?: () => void
}

export function FileMessage({ filename, size, onDownload }: FileMessageProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = () => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return '📕'
    if (['doc', 'docx'].includes(ext || '')) return '📘'
    if (['xls', 'xlsx'].includes(ext || '')) return '📗'
    if (['ppt', 'pptx'].includes(ext || '')) return '📙'
    if (['zip', 'rar', '7z'].includes(ext || '')) return '📦'
    if (['txt', 'md'].includes(ext || '')) return '📄'
    return '📎'
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-bg-card to-bg-hover border-2 border-gold-primary/20 hover:border-gold-primary/40 rounded-2xl min-w-[240px] max-w-[280px] transition-all group">
      <div className="flex-shrink-0 text-3xl">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {filename}
        </p>
        <p className="text-xs text-gold-primary font-medium">
          {formatFileSize(size)}
        </p>
      </div>

      {onDownload && (
        <button
          onClick={onDownload}
          className="flex-shrink-0 p-2 bg-gold-primary/10 hover:bg-gold-primary/20 rounded-lg transition-all group-hover:scale-110"
          title="Download"
        >
          <Download className="w-5 h-5 text-gold-primary" />
        </button>
      )}
    </div>
  )
}
