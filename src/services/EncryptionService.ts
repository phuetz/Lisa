/**
 * 🔐 Encryption Service
 * Chiffrement end-to-end AES-256-GCM pour données sensibles
 * Les données utilisateur sont protégées avec un mot de passe maître
 */

export interface EncryptedData {
  encrypted: Uint8Array;
  salt: Uint8Array;
  iv: Uint8Array;
}

export class EncryptionService {
  private algorithm = 'AES-GCM';
  private keyLength = 256;
  private iterations = 100000; // PBKDF2 iterations
  
  /**
   * Dérive une clé de chiffrement depuis un mot de passe utilisateur
   */
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    
    // Importer le mot de passe comme key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Dériver la clé avec PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { 
        name: this.algorithm, 
        length: this.keyLength 
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Chiffre des données avec AES-256-GCM
   */
  async encrypt(data: string, password: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    
    // Générer salt et IV aléatoires
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Dériver la clé
    const key = await this.deriveKey(password, salt);
    
    // Chiffrer
    const encrypted = await crypto.subtle.encrypt(
      { 
        name: this.algorithm, 
        iv 
      },
      key,
      encoder.encode(data)
    );
    
    return {
      encrypted: new Uint8Array(encrypted),
      salt,
      iv
    };
  }
  
  /**
   * Déchiffre des données
   */
  async decrypt(
    encryptedData: EncryptedData,
    password: string
  ): Promise<string> {
    // Dériver la clé avec le même salt
    const key = await this.deriveKey(password, encryptedData.salt);
    
    try {
      // Déchiffrer
      const decrypted = await crypto.subtle.decrypt(
        { 
          name: this.algorithm, 
          iv: encryptedData.iv as BufferSource
        },
        key,
        encryptedData.encrypted as BufferSource
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch {
      throw new Error('Déchiffrement échoué: mot de passe incorrect ou données corrompues');
    }
  }
  
  /**
   * Chiffre un objet JSON
   */
  async encryptJSON<T>(obj: T, password: string): Promise<EncryptedData> {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, password);
  }
  
  /**
   * Déchiffre un objet JSON
   */
  async decryptJSON<T>(
    encryptedData: EncryptedData,
    password: string
  ): Promise<T> {
    const jsonString = await this.decrypt(encryptedData, password);
    return JSON.parse(jsonString) as T;
  }
  
  /**
   * Sérialise les données chiffrées pour stockage
   */
  serializeEncrypted(data: EncryptedData): string {
    return JSON.stringify({
      encrypted: Array.from(data.encrypted),
      salt: Array.from(data.salt),
      iv: Array.from(data.iv)
    });
  }
  
  /**
   * Désérialise les données chiffrées depuis le stockage
   */
  deserializeEncrypted(serialized: string): EncryptedData {
    const obj = JSON.parse(serialized);
    return {
      encrypted: new Uint8Array(obj.encrypted),
      salt: new Uint8Array(obj.salt),
      iv: new Uint8Array(obj.iv)
    };
  }
  
  /**
   * Vérifie la force d'un mot de passe
   */
  validatePassword(password: string): {
    valid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 12) {
      errors.push('Le mot de passe doit contenir au moins 12 caractères');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }
    
    // Calculer la force
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (errors.length === 0 && password.length >= 16) {
      strength = 'strong';
    } else if (errors.length <= 2) {
      strength = 'medium';
    }
    
    return {
      valid: errors.length === 0,
      strength,
      errors
    };
  }
  
  /**
   * Génère un mot de passe fort aléatoire
   */
  generatePassword(length = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array)
      .map(x => charset[x % charset.length])
      .join('');
  }
}

// Instance singleton
export const encryptionService = new EncryptionService();
