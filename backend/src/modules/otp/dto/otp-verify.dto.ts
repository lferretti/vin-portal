import { IsString, IsUUID, Matches } from 'class-validator';

export class OtpVerifyDto {
  @IsString()
  @IsUUID()
  otpChallengeId: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be a 6-digit number' })
  code: string;
}
