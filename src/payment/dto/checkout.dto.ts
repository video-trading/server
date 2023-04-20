import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nonce: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  videoId: string;
}

export class CheckoutWithTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  videoId: string;
}
