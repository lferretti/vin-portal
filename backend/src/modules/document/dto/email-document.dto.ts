import { IsEmail } from 'class-validator';

export class EmailDocumentDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;
}
