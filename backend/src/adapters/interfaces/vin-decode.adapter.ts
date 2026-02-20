export interface VinDecodeResult {
  year: number;
  make: string;
  model: string;
}

export interface VinDecodeAdapter {
  decode(vin: string): Promise<VinDecodeResult>;
}
