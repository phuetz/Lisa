/**
 * Input Sanitization Utilities - DOMPurify-based XSS Prevention
 *
 * Provides sanitization functions for user input and markdown content
 * to prevent XSS attacks and injection vulnerabilities.
 */

import DOMPurify from 'dompurify';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Strict config - plain text only, no HTML
 */
const PLAIN_TEXT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false
};

/**
 * Markdown-safe config - allows common formatting tags
 */
const MARKDOWN_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'code', 'pre', 'blockquote',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'hr', 'span', 'div', 'sup', 'sub'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src', 'class', 'id',
    'target', 'rel', 'width', 'height'
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
};

/**
 * Rich HTML config - for trusted content only
 */
const RICH_HTML_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    ...MARKDOWN_CONFIG.ALLOWED_TAGS as string[],
    'details', 'summary', 'figure', 'figcaption',
    'article', 'section', 'header', 'footer', 'nav', 'aside',
    'abbr', 'cite', 'dfn', 'kbd', 'mark', 'q', 'time', 'var',
    'dl', 'dt', 'dd', 'address'
  ],
  ALLOWED_ATTR: [
    ...MARKDOWN_CONFIG.ALLOWED_ATTR as string[],
    'datetime', 'cite', 'data-*', 'aria-*', 'role'
  ],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
};

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize user input to plain text
 * Removes ALL HTML tags, keeping only text content
 *
 * @example
 * sanitizeUserInput('<script>alert("xss")</script>Hello') // 'Hello'
 * sanitizeUserInput('Hello <b>World</b>') // 'Hello World'
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(input, PLAIN_TEXT_CONFIG);
}

/**
 * Sanitize markdown-rendered HTML
 * Allows common formatting but removes dangerous elements
 *
 * @example
 * sanitizeMarkdown('<p>Hello</p><script>bad</script>') // '<p>Hello</p>'
 */
export function sanitizeMarkdown(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, MARKDOWN_CONFIG);
}

/**
 * Sanitize rich HTML content (trusted sources only)
 * Allows more tags but still removes scripts and event handlers
 */
export function sanitizeRichHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, RICH_HTML_CONFIG);
}

/**
 * Sanitize a URL to prevent javascript: and data: protocol attacks
 *
 * @example
 * sanitizeUrl('javascript:alert(1)') // ''
 * sanitizeUrl('https://example.com') // 'https://example.com'
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:application',
    'file:'
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      console.warn('[Sanitize] Blocked dangerous URL:', url.slice(0, 50));
      return '';
    }
  }

  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'data:image/'];
  const hasProtocol = safeProtocols.some(p => trimmed.startsWith(p));
  const isRelative = !trimmed.includes(':') || trimmed.startsWith('/');

  if (!hasProtocol && !isRelative) {
    console.warn('[Sanitize] Unknown protocol in URL:', url.slice(0, 50));
    return '';
  }

  return url;
}

/**
 * Sanitize JSON string to prevent prototype pollution
 */
export function sanitizeJson<T>(jsonString: string): T | null {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString);

    // Recursively clean the object
    return deepCleanObject(parsed) as T;
  } catch (error) {
    console.warn('[Sanitize] Invalid JSON:', error);
    return null;
  }
}

/**
 * Deep clean object to prevent prototype pollution
 */
function deepCleanObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepCleanObject);
  }

  const cleaned: Record<string, unknown> = {};

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    // Block prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn('[Sanitize] Blocked prototype pollution key:', key);
      continue;
    }

    cleaned[key] = deepCleanObject((obj as Record<string, unknown>)[key]);
  }

  return cleaned;
}

/**
 * Escape special characters for safe display
 * Useful for displaying user input in non-HTML contexts
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return text.replace(/[&<>"'`=/]/g, char => escapeMap[char] || char);
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed';
  }

  // Remove path components
  let sanitized = filename.replace(/^.*[\\/]/, '');

  // Remove dangerous characters
  // eslint-disable-next-line no-control-regex -- intentionally matching control characters for filename sanitization
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

  // Prevent hidden files on Unix
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.slice(1);
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }

  return sanitized || 'unnamed';
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a string contains potentially dangerous content
 */
export function containsXss(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,  // Event handlers
    /data:text\/html/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /expression\s*\(/i,  // CSS expression
    /vbscript:/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional check for dangerous characters
  if (containsXss(trimmed)) {
    return null;
  }

  return trimmed;
}

// ============================================================================
// DOMPurify Hooks (for advanced customization)
// ============================================================================

/**
 * Configure DOMPurify with custom hooks
 * Call this once at app initialization if needed
 */
export function configureSanitizer(): void {
  // Add target="_blank" and rel="noopener" to all links
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }

    // Remove dangerous attributes that might have slipped through
    if (node.hasAttribute('style')) {
      const style = node.getAttribute('style') || '';
      if (style.includes('expression') || style.includes('javascript')) {
        node.removeAttribute('style');
      }
    }
  });

  console.log('[Sanitize] DOMPurify configured with security hooks');
}

// ============================================================================
// Export Types
// ============================================================================

export interface SanitizeOptions {
  /** Allow basic HTML formatting */
  allowHtml?: boolean;
  /** Allow rich HTML (more tags) */
  allowRichHtml?: boolean;
  /** Maximum length after sanitization */
  maxLength?: number;
  /** Custom allowed tags */
  allowedTags?: string[];
}

/**
 * Generic sanitize function with options
 */
export function sanitize(input: string, options: SanitizeOptions = {}): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let result: string;

  if (options.allowRichHtml) {
    result = sanitizeRichHtml(input);
  } else if (options.allowHtml) {
    result = sanitizeMarkdown(input);
  } else {
    result = sanitizeUserInput(input);
  }

  // Apply custom allowed tags if specified
  if (options.allowedTags) {
    result = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: options.allowedTags,
      ALLOWED_ATTR: MARKDOWN_CONFIG.ALLOWED_ATTR
    });
  }

  // Truncate if needed
  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result;
}

export default {
  sanitizeUserInput,
  sanitizeMarkdown,
  sanitizeRichHtml,
  sanitizeUrl,
  sanitizeJson,
  sanitizeFilename,
  sanitizeEmail,
  escapeHtml,
  containsXss,
  configureSanitizer,
  sanitize
};
