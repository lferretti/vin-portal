import { IsString, MinLength, MaxLength, Matches, Length } from 'class-validator';

export class AuthenticateContractDto {
  @IsString()
  @Length(7, 17)
  @Matches(/^[A-HJ-NPR-Z0-9]{7,17}$/i, { message: 'vin7 must be 7-17 valid VIN characters' })
  vin7: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, { message: 'ZIP must be a valid US ZIP code' })
  zip: string;
}
