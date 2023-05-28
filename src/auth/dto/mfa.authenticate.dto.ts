import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { z } from 'zod';

export const GetMfaAuthenticateResponseSchema = z.object({
  id: z.string(),
  challenge: z.string(),
});
export class GetMfaAuthenticateResponse {
  @ApiProperty({
    description: 'The id string for the MFA device authentication',
  })
  id: string;
  @ApiProperty({
    description: 'The challenge string for the MFA device authentication',
  })
  challenge: string;
}

export class CreateMfaAuthenticateDto {
  @ApiProperty({
    description: 'The id string for the MFA device authentication',
  })
  @IsString()
  credentialId: string;
  @ApiProperty({
    description: 'The authenticator data for the MFA device authentication',
  })
  @IsString()
  authenticatorData: string;
  @ApiProperty({
    description: 'The client data for the MFA device authentication',
  })
  @IsString()
  clientData: string;
  @ApiProperty({
    description: 'The signature for the MFA device authentication',
  })
  @IsString()
  signature: string;
}
