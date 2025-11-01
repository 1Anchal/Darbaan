import { InputSanitizer } from '../sanitization';

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('Hello World');
    });

    it('should escape special characters', () => {
      const input = 'Hello & "World" <test>';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = InputSanitizer.sanitizeString(input);
      expect(result).toBe('Hello World');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize valid email', () => {
      const input = '  TEST@EXAMPLE.COM  ';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe('test@example.com');
    });

    it('should return original for invalid email', () => {
      const input = 'invalid-email';
      const result = InputSanitizer.sanitizeEmail(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeUUID', () => {
    it('should validate and return valid UUID', () => {
      const input = '123e4567-e89b-12d3-a456-426614174000';
      const result = InputSanitizer.sanitizeUUID(input);
      expect(result).toBe(input);
    });

    it('should return null for invalid UUID', () => {
      const input = 'invalid-uuid';
      const result = InputSanitizer.sanitizeUUID(input);
      expect(result).toBeNull();
    });
  });

  describe('sanitizeMacAddress', () => {
    it('should validate and normalize MAC address', () => {
      const input = 'aa:bb:cc:dd:ee:ff';
      const result = InputSanitizer.sanitizeMacAddress(input);
      expect(result).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('should return null for invalid MAC address', () => {
      const input = 'invalid-mac';
      const result = InputSanitizer.sanitizeMacAddress(input);
      expect(result).toBeNull();
    });
  });

  describe('sanitizeSQLInjection', () => {
    it('should remove SQL injection patterns', () => {
      const input = "'; DROP TABLE users; --";
      const result = InputSanitizer.sanitizeSQLInjection(input);
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('--');
      expect(result).not.toContain(';');
    });

    it('should remove OR/AND injection patterns', () => {
      const input = "1 OR 1=1";
      const result = InputSanitizer.sanitizeSQLInjection(input);
      expect(result).not.toContain('OR 1=1');
    });
  });

  describe('sanitizeObject', () => {
    it('should recursively sanitize object properties', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        email: '  JOHN@EXAMPLE.COM  ',
        id: '123e4567-e89b-12d3-a456-426614174000',
        nested: {
          value: 'Hello & World'
        }
      };

      const result = InputSanitizer.sanitizeObject(input);
      
      expect(result.name).not.toContain('<script>');
      expect(result.email).toBe('john@example.com');
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.nested.value).toContain('&amp;');
    });

    it('should handle arrays', () => {
      const input = {
        tags: ['<script>tag1</script>', 'tag2 & tag3']
      };

      const result = InputSanitizer.sanitizeObject(input);
      
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[1]).toContain('&amp;');
    });

    it('should prevent deep recursion', () => {
      const input: any = {};
      let current = input;
      
      // Create a deeply nested object
      for (let i = 0; i < 15; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'test';

      // Should not throw an error
      expect(() => InputSanitizer.sanitizeObject(input)).not.toThrow();
    });
  });
});