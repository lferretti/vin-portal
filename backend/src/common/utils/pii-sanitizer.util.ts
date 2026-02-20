const PII_FIELDS = new Set([
  'contractNumber',
  'lastName',
  'zip',
  'code',
  'otpCode',
  'password',
  'ssn',
  'email',
  'phone',
  'sourceIp',
  'userAgent',
]);

export function sanitizePii(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: sanitizeString(obj.message),
      stack: obj.stack,
    };
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePii(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELDS.has(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePii(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeString(str: string): string {
  // Remove potential PII patterns (ZIP codes, phone numbers)
  return str
    .replace(/\b\d{5}(-\d{4})?\b/g, '[ZIP]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
}
