import { IsIn, IsString } from 'class-validator';

export class AdminDevLoginDto {
  @IsString()
  @IsIn(['admin', 'support'])
  role!: string;
}
