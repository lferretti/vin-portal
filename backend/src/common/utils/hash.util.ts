import { createHash } from 'crypto';

export function hashContractNumber(contractNumber: string, salt: string): string {
  return createHash('sha256')
    .update(`${salt}:${contractNumber}`)
    .digest('hex');
}

export function hashOtpCode(code: string, salt: string): string {
  return createHash('sha256')
    .update(`${salt}:${code}`)
    .digest('hex');
}
