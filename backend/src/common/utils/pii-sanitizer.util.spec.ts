import { sanitizePii } from './pii-sanitizer.util';

describe('pii-sanitizer.util', () => {
  it('should redact known PII fields from objects', () => {
    const input = {
      contractNumber: 'CONTRACT-001',
      lastName: 'Smith',
      zip: '30301',
      status: 'active',
    };
    const result = sanitizePii(input) as Record<string, unknown>;
    expect(result['contractNumber']).toBe('[REDACTED]');
    expect(result['lastName']).toBe('[REDACTED]');
    expect(result['zip']).toBe('[REDACTED]');
    expect(result['status']).toBe('active');
  });

  it('should redact phone and email fields', () => {
    const input = {
      phone: '555-123-4567',
      email: 'test@example.com',
      id: 'abc-123',
    };
    const result = sanitizePii(input) as Record<string, unknown>;
    expect(result['phone']).toBe('[REDACTED]');
    expect(result['email']).toBe('[REDACTED]');
    expect(result['id']).toBe('abc-123');
  });

  it('should redact code and otpCode fields', () => {
    const input = { code: '123456', otpCode: '654321' };
    const result = sanitizePii(input) as Record<string, unknown>;
    expect(result['code']).toBe('[REDACTED]');
    expect(result['otpCode']).toBe('[REDACTED]');
  });

  it('should redact sourceIp and userAgent fields', () => {
    const input = {
      sourceIp: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      eventType: 'AUTH',
    };
    const result = sanitizePii(input) as Record<string, unknown>;
    expect(result['sourceIp']).toBe('[REDACTED]');
    expect(result['userAgent']).toBe('[REDACTED]');
    expect(result['eventType']).toBe('AUTH');
  });

  it('should sanitize nested objects recursively', () => {
    const input = {
      outer: {
        contractNumber: 'CONTRACT-001',
        innerField: 'visible',
      },
    };
    const result = sanitizePii(input) as Record<string, unknown>;
    const outer = result['outer'] as Record<string, unknown>;
    expect(outer['contractNumber']).toBe('[REDACTED]');
    expect(outer['innerField']).toBe('visible');
  });

  it('should sanitize arrays', () => {
    const input = [
      { lastName: 'Smith', id: '1' },
      { lastName: 'Jones', id: '2' },
    ];
    const result = sanitizePii(input) as Array<Record<string, unknown>>;
    expect(result[0]['lastName']).toBe('[REDACTED]');
    expect(result[0]['id']).toBe('1');
    expect(result[1]['lastName']).toBe('[REDACTED]');
  });

  it('should return null and undefined as-is', () => {
    expect(sanitizePii(null)).toBeNull();
    expect(sanitizePii(undefined)).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(sanitizePii(42)).toBe(42);
    expect(sanitizePii('hello')).toBe('hello');
    expect(sanitizePii(true)).toBe(true);
  });

  it('should sanitize Error objects (replace ZIP and phone patterns in message)', () => {
    const error = new Error('User at ZIP 30301 with phone 555-123-4567');
    const result = sanitizePii(error) as Record<string, unknown>;
    expect(result['name']).toBe('Error');
    expect(result['message']).toContain('[ZIP]');
    expect(result['message']).toContain('[PHONE]');
    expect(result['message']).not.toContain('30301');
    expect(result['message']).not.toContain('555-123-4567');
  });

  it('should redact password and ssn fields', () => {
    const input = { password: 'secret', ssn: '123-45-6789', name: 'test' };
    const result = sanitizePii(input) as Record<string, unknown>;
    expect(result['password']).toBe('[REDACTED]');
    expect(result['ssn']).toBe('[REDACTED]');
    expect(result['name']).toBe('test');
  });
});
