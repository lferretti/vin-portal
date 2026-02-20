import { IsString, MinLength, MaxLength } from 'class-validator';

export class AdminNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  note: string;
}
