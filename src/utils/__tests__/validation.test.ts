/**
 * Tests for validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeInput,
  isValidEmail,
  isValidUrl,
  isSafeUrl,
  sanitizeFilename,
  isValidJson,
  parseJsonSafely,
  validateLength,
  validateRange,
  validateEnum,
  validator,
  InputValidator,
} from '../validation';

describe('Sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const input = 'Hello<script>alert("xss")</script>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('Hello');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = 'onclick=alert("xss")';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onclick=');
    });

    it('should trim whitespace', () => {
      const input = '  hello  ';
      const result = sanitizeInput(input);
      expect(result).toBe('hello');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path traversal', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should allow safe characters', () => {
      const input = 'my-file_name.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('my-file_name.txt');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(300);
      const result = sanitizeFilename(input);
      expect(result.length).toBeLessThanOrEqual(255);
    });
  });
});

describe('Validation', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('//example.com')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    it('should allow safe URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject dangerous URLs', () => {
      expect(isSafeUrl('javascript:alert("xss")')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert("xss")</script>')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });
  });

  describe('isValidJson', () => {
    it('should validate correct JSON', () => {
      expect(isValidJson('{"key": "value"}')).toBe(true);
      expect(isValidJson('[1, 2, 3]')).toBe(true);
      expect(isValidJson('"string"')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(isValidJson('{invalid}')).toBe(false);
      expect(isValidJson('undefined')).toBe(false);
      expect(isValidJson('')).toBe(false);
    });
  });

  describe('parseJsonSafely', () => {
    it('should parse valid JSON', () => {
      const result = parseJsonSafely('{"key": "value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true };
      const result = parseJsonSafely('invalid', fallback);
      expect(result).toEqual(fallback);
    });
  });

  describe('validateLength', () => {
    it('should validate within range', () => {
      const result = validateLength('hello', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should reject too short', () => {
      const result = validateLength('hi', 5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum');
    });

    it('should reject too long', () => {
      const result = validateLength('hello world', 1, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });
  });

  describe('validateRange', () => {
    it('should validate within range', () => {
      const result = validateRange(5, 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should reject below minimum', () => {
      const result = validateRange(0, 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum');
    });

    it('should reject above maximum', () => {
      const result = validateRange(15, 1, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });
  });

  describe('validateEnum', () => {
    it('should validate allowed values', () => {
      const result = validateEnum('red', ['red', 'green', 'blue']);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('red');
    });

    it('should reject disallowed values', () => {
      const result = validateEnum('yellow', ['red', 'green', 'blue']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });
  });
});

describe('InputValidator', () => {
  it('should validate required fields', () => {
    const v = validator<string>().required();
    expect(v.validate('hello').valid).toBe(true);
    expect(v.validate('').valid).toBe(false);
    expect(v.validate(null as any).valid).toBe(false);
  });

  it('should validate min length', () => {
    const v = validator<string>().minLength(5);
    expect(v.validate('hello').valid).toBe(true);
    expect(v.validate('hi').valid).toBe(false);
  });

  it('should validate max length', () => {
    const v = validator<string>().maxLength(5);
    expect(v.validate('hello').valid).toBe(true);
    expect(v.validate('hello world').valid).toBe(false);
  });

  it('should validate pattern', () => {
    const v = validator<string>().pattern(/^[a-z]+$/);
    expect(v.validate('hello').valid).toBe(true);
    expect(v.validate('Hello').valid).toBe(false);
    expect(v.validate('hello123').valid).toBe(false);
  });

  it('should validate email', () => {
    const v = validator<string>().email();
    expect(v.validate('test@example.com').valid).toBe(true);
    expect(v.validate('invalid').valid).toBe(false);
  });

  it('should validate URL', () => {
    const v = validator<string>().url();
    expect(v.validate('https://example.com').valid).toBe(true);
    expect(v.validate('not-a-url').valid).toBe(false);
  });

  it('should validate safe URL', () => {
    const v = validator<string>().safeUrl();
    expect(v.validate('https://example.com').valid).toBe(true);
    expect(v.validate('javascript:alert("xss")').valid).toBe(false);
  });

  it('should validate number range', () => {
    const v = validator<number>().range(1, 10);
    expect(v.validate(5).valid).toBe(true);
    expect(v.validate(0).valid).toBe(false);
    expect(v.validate(15).valid).toBe(false);
  });

  it('should validate custom rules', () => {
    const v = validator<string>().custom(
      (value) => value.startsWith('hello'),
      'Must start with hello'
    );
    expect(v.validate('hello world').valid).toBe(true);
    expect(v.validate('goodbye').valid).toBe(false);
  });

  it('should chain multiple validations', () => {
    const v = validator<string>()
      .required()
      .minLength(5)
      .maxLength(10)
      .pattern(/^[a-z]+$/);

    expect(v.validate('hello').valid).toBe(true);
    expect(v.validate('').valid).toBe(false);
    expect(v.validate('hi').valid).toBe(false);
    expect(v.validate('helloworld').valid).toBe(true);
    expect(v.validate('hello world').valid).toBe(false);
    expect(v.validate('Hello').valid).toBe(false);
  });

  it('should collect all errors', () => {
    const v = validator<string>()
      .required('Field is required')
      .minLength(5, 'Min 5 chars')
      .pattern(/^[a-z]+$/, 'Lowercase only');

    const result = v.validate('Hi');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors).toContain('Min 5 chars');
    expect(result.errors).toContain('Lowercase only');
  });
});
