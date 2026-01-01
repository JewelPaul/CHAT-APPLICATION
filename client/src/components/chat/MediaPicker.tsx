import { useRef, ChangeEvent } from 'react'
import { Paperclip } from 'lucide-react'

interface MediaPickerProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function MediaPicker({ onFileSelect, disabled = false }: MediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      // Reset input so same file can be selected again
      e.target.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        disabled={disabled}
      />
      
      <button
        onClick={handleClick}
        disabled={disabled}
        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />
      </button>
    </>
  )
}

// Individual media type pickers (optional, for specific use cases)
export function ImagePicker({ onFileSelect, disabled = false }: MediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        disabled={disabled}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="Send image"
      >
        <Image className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>
    </>
  )
}
