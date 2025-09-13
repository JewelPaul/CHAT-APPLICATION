// End-to-End Encryption utilities using Web Crypto API
// This provides real encryption for secure chat

class ChatEncryption {
  private keyPair: CryptoKeyPair | null = null
  private sharedKey: CryptoKey | null = null
  private peerPublicKey: CryptoKey | null = null

  // Generate ECDH key pair for key exchange
  async generateKeyPair(): Promise<CryptoKeyPair> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true, // extractable
      ['deriveKey']
    )
    return this.keyPair
  }

  // Export public key for sharing with peer
  async exportPublicKey(): Promise<ArrayBuffer> {
    if (!this.keyPair?.publicKey) {
      throw new Error('No key pair generated')
    }
    return await window.crypto.subtle.exportKey('raw', this.keyPair.publicKey)
  }

  // Import peer's public key
  async importPeerPublicKey(publicKeyBuffer: ArrayBuffer): Promise<void> {
    this.peerPublicKey = await window.crypto.subtle.importKey(
      'raw',
      publicKeyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      []
    )
  }

  // Derive shared encryption key from key exchange
  async deriveSharedKey(): Promise<void> {
    if (!this.keyPair?.privateKey || !this.peerPublicKey) {
      throw new Error('Missing keys for derivation')
    }

    this.sharedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: this.peerPublicKey
      },
      this.keyPair.privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Encrypt a message
  async encrypt(message: string): Promise<{ encrypted: ArrayBuffer; iv: ArrayBuffer }> {
    if (!this.sharedKey) {
      throw new Error('No shared key available')
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.sharedKey,
      data
    )

    return { encrypted, iv }
  }

  // Decrypt a message
  async decrypt(encrypted: ArrayBuffer, iv: ArrayBuffer): Promise<string> {
    if (!this.sharedKey) {
      throw new Error('No shared key available')
    }

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      this.sharedKey,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  // Convert ArrayBuffer to base64 for transmission
  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  // Convert base64 to ArrayBuffer
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Reset encryption state
  reset(): void {
    this.keyPair = null
    this.sharedKey = null
    this.peerPublicKey = null
  }

  // Check if encryption is ready
  isReady(): boolean {
    return this.sharedKey !== null
  }
}

// Simple fallback encryption for environments without Web Crypto API
class SimpleCrypto {
  private key: string = ''

  setKey(key: string): void {
    this.key = key
  }

  encrypt(message: string): string {
    if (!this.key) return btoa(message) // Simple base64 if no key
    
    // Simple XOR cipher (not secure, just for fallback)
    let encrypted = ''
    for (let i = 0; i < message.length; i++) {
      const charCode = message.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      encrypted += String.fromCharCode(charCode)
    }
    return btoa(encrypted)
  }

  decrypt(encrypted: string): string {
    if (!this.key) return atob(encrypted) // Simple base64 if no key
    
    const decoded = atob(encrypted)
    let decrypted = ''
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      decrypted += String.fromCharCode(charCode)
    }
    return decrypted
  }

  isReady(): boolean {
    return this.key.length > 0
  }

  reset(): void {
    this.key = ''
  }
}

// Factory function to create appropriate encryption instance
export function createEncryption(): ChatEncryption | SimpleCrypto {
  if (window.crypto && window.crypto.subtle) {
    return new ChatEncryption()
  } else {
    console.warn('Web Crypto API not available, using fallback encryption')
    return new SimpleCrypto()
  }
}

export { ChatEncryption, SimpleCrypto }