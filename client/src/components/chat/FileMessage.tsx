import { Download } from 'lucide-react'

interface FileMessageProps {
  filename: string
  size?: number
  mimeType?: string
  onDownload?: () => void
}

export function FileMessage({ filename, size, mimeType, onDownload }: FileMessageProps) {
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = () => {
    if (mimeType?.includes('pdf')) return '📄'
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝'
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊'
    if (mimeType?.includes('zip') || mimeType?.includes('compressed')) return '🗜️'
    return '📎'
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl min-w-[240px] max-w-[280px]">
      <div className="flex-shrink-0 text-2xl">
        {getFileIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {filename}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {formatFileSize(size)}
        </p>
      </div>

      {onDownload && (
        <button
          onClick={onDownload}
          className="flex-shrink-0 p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-[var(--accent)]" />
        </button>
      )}
    </div>
  )
}
