import { IsString, Matches } from 'class-validator';

export class VinDecodeDto {
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, {
    message: 'VIN must be exactly 17 valid characters (no I, O, or Q)',
  })
  vin: string;
}
