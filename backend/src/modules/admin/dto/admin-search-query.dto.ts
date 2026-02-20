import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminSearchQueryDto {
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsOptional()
  @IsString()
  externalContractId?: string;

  @IsOptional()
  @IsUUID()
  requestId?: string;
}
