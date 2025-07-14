export class SecureTokenStorage {
  private encryptionKey: CryptoKey | null = null;

  async init() {
    if (!this.encryptionKey) {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }
  }

  async storeToken(token: string): Promise<void> {
    if (!this.encryptionKey) {
      await this.init();
    }
    const encrypted = await this.encrypt(token);
    sessionStorage.setItem('google_access_token', encrypted);
  }

  async getToken(): Promise<string | null> {
    if (!this.encryptionKey) {
      await this.init();
    }
    const data = sessionStorage.getItem('google_access_token');
    if (!data) return null;
    try {
      return await this.decrypt(data);
    } catch {
      return null;
    }
  }

  removeToken(): void {
    sessionStorage.removeItem('google_access_token');
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  }
}

export const secureTokenStorage = new SecureTokenStorage();
