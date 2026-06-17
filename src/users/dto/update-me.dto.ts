import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({
    example: 'Muhammad Nurfatkhur Rahman',
    minLength: 2,
    maxLength: 50,
    description: 'Display name',
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;

  @ApiPropertyOptional({
    example: 'mhmdnurf',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-z0-9_]+$',
    description: 'Unique lowercase username',
  })
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Username can only contain lowercase letters, numbers and underscores',
  })
  username?: string;
}
