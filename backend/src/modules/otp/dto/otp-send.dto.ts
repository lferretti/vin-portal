import { IsString, IsUUID } from 'class-validator';

export class OtpSendDto {
  @IsString()
  @IsUUID()
  otpChallengeId: string;
}
