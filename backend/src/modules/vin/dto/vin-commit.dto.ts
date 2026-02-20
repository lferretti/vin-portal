import { IsString, IsBoolean, Matches } from 'class-validator';

export class VinCommitDto {
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/, {
    message: 'VIN must be exactly 17 valid characters',
  })
  vin: string;

  @IsBoolean()
  acceptIrreversible: boolean;
}
