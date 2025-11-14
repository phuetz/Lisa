/**
 * Input validation and sanitization utilities
 * Provides protection against XSS, injection, and malformed data
 */

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Sanitize user input by removing dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate safe URL (no javascript:, data:, etc.)
 */
export function isSafeUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;

  try {
    const parsed = new URL(url);
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    return !dangerousProtocols.some(proto =>
      parsed.protocol.toLowerCase().startsWith(proto)
    );
  } catch {
    return false;
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow safe characters
    .replace(/\.\./g, '_') // Remove path traversal
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Validate JSON string
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and parse JSON safely
 */
export function parseJsonSafely<T = any>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Validate string length
 */
export function validateLength(
  str: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (str.length < min) {
    return { valid: false, error: `Minimum length is ${min}` };
  }
  if (str.length > max) {
    return { valid: false, error: `Maximum length is ${max}` };
  }
  return { valid: true };
}

/**
 * Validate number range
 */
export function validateRange(
  num: number,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (num < min) {
    return { valid: false, error: `Minimum value is ${min}` };
  }
  if (num > max) {
    return { valid: false, error: `Maximum value is ${max}` };
  }
  return { valid: true };
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: T[]
): { valid: boolean; error?: string; value?: T } {
  if (allowedValues.includes(value as T)) {
    return { valid: true, value: value as T };
  }
  return {
    valid: false,
    error: `Value must be one of: ${allowedValues.join(', ')}`,
  };
}

/**
 * Validate object shape
 */
export function validateShape<T extends Record<string, any>>(
  obj: any,
  requiredKeys: (keyof T)[]
): { valid: boolean; error?: string } {
  if (typeof obj !== 'object' || obj === null) {
    return { valid: false, error: 'Value must be an object' };
  }

  const missing = requiredKeys.filter(key => !(key in obj));
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required keys: ${missing.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * SQL injection prevention - escape single quotes
 */
export function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * Validate and sanitize regex pattern
 */
export function sanitizeRegexPattern(pattern: string): string | null {
  try {
    new RegExp(pattern);
    return pattern;
  } catch {
    return null;
  }
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate date string
 */
export function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Comprehensive input validator builder
 */
export class InputValidator<T = any> {
  private validators: Array<(value: T) => { valid: boolean; error?: string }> = [];

  required(message?: string) {
    this.validators.push((value) => {
      if (value === null || value === undefined || value === '') {
        return { valid: false, error: message || 'This field is required' };
      }
      return { valid: true };
    });
    return this;
  }

  minLength(min: number, message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && value.length < min) {
        return { valid: false, error: message || `Minimum length is ${min}` };
      }
      return { valid: true };
    });
    return this;
  }

  maxLength(max: number, message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && value.length > max) {
        return { valid: false, error: message || `Maximum length is ${max}` };
      }
      return { valid: true };
    });
    return this;
  }

  pattern(regex: RegExp, message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && !regex.test(value)) {
        return { valid: false, error: message || 'Invalid format' };
      }
      return { valid: true };
    });
    return this;
  }

  email(message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && !isValidEmail(value)) {
        return { valid: false, error: message || 'Invalid email address' };
      }
      return { valid: true };
    });
    return this;
  }

  url(message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && !isValidUrl(value)) {
        return { valid: false, error: message || 'Invalid URL' };
      }
      return { valid: true };
    });
    return this;
  }

  safeUrl(message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'string' && !isSafeUrl(value)) {
        return { valid: false, error: message || 'Unsafe URL' };
      }
      return { valid: true };
    });
    return this;
  }

  range(min: number, max: number, message?: string) {
    this.validators.push((value) => {
      if (typeof value === 'number') {
        const result = validateRange(value, min, max);
        if (!result.valid) {
          return { valid: false, error: message || result.error };
        }
      }
      return { valid: true };
    });
    return this;
  }

  custom(
    validator: (value: T) => boolean,
    message?: string
  ) {
    this.validators.push((value) => {
      if (!validator(value)) {
        return { valid: false, error: message || 'Validation failed' };
      }
      return { valid: true };
    });
    return this;
  }

  validate(value: T): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const validator of this.validators) {
      const result = validator(value);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a new validator
 */
export function validator<T = any>(): InputValidator<T> {
  return new InputValidator<T>();
}

/**
 * Content Security Policy generator
 */
export function generateCSP(options: {
  allowInlineScripts?: boolean;
  allowInlineStyles?: boolean;
  allowedDomains?: string[];
  allowData?: boolean;
}): string {
  const directives: string[] = [];

  // Default directives
  directives.push("default-src 'self'");

  // Script sources
  const scriptSrc = ["'self'"];
  if (options.allowInlineScripts) {
    scriptSrc.push("'unsafe-inline'");
  }
  directives.push(`script-src ${scriptSrc.join(' ')}`);

  // Style sources
  const styleSrc = ["'self'"];
  if (options.allowInlineStyles) {
    styleSrc.push("'unsafe-inline'");
  }
  directives.push(`style-src ${styleSrc.join(' ')}`);

  // Image sources
  const imgSrc = ["'self'"];
  if (options.allowData) {
    imgSrc.push('data:');
  }
  if (options.allowedDomains) {
    imgSrc.push(...options.allowedDomains);
  }
  directives.push(`img-src ${imgSrc.join(' ')}`);

  // Font sources
  directives.push("font-src 'self' data:");

  // Connect sources
  const connectSrc = ["'self'"];
  if (options.allowedDomains) {
    connectSrc.push(...options.allowedDomains);
  }
  directives.push(`connect-src ${connectSrc.join(' ')}`);

  return directives.join('; ');
}

/**
 * Rate limiting for user actions (client-side)
 */
export class ActionThrottler {
  private lastAction: number = 0;
  private actionCount: number = 0;
  private windowStart: number = Date.now();

  constructor(
    private minInterval: number = 1000,
    private maxActionsPerWindow: number = 10,
    private windowDuration: number = 60000
  ) {}

  canPerformAction(): boolean {
    const now = Date.now();

    // Check minimum interval
    if (now - this.lastAction < this.minInterval) {
      return false;
    }

    // Check window
    if (now - this.windowStart > this.windowDuration) {
      this.actionCount = 0;
      this.windowStart = now;
    }

    // Check max actions
    if (this.actionCount >= this.maxActionsPerWindow) {
      return false;
    }

    return true;
  }

  performAction(): boolean {
    if (!this.canPerformAction()) {
      return false;
    }

    this.lastAction = Date.now();
    this.actionCount++;
    return true;
  }

  reset(): void {
    this.lastAction = 0;
    this.actionCount = 0;
    this.windowStart = Date.now();
  }
}
