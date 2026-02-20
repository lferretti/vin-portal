export function maskVin(vin: string): string {
  if (vin.length < 7) return '***';
  return `${vin.substring(0, 3)}******${vin.substring(vin.length - 4)}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return '***';
  return `***-***-${phone.substring(phone.length - 4)}`;
}
