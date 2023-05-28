import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export enum MfaStatus {
  registered = 'registered',
  not_registered = 'not_registered',
}

export const MfaGetCredentialSchema = z
  .object({
    id: z.string(),
    publicKey: z.string(),
    algorithm: z.enum(['RS256', 'ES256']),
  })
  .required({
    publicKey: true,
    id: true,
    algorithm: true,
  });

export const GetMfaAuthenticationResponseSchema = z.object({
  id: z.string().optional(),
  challenge: z.string(),
  status: z.enum([MfaStatus.not_registered, MfaStatus.registered]),
});

export class GetMfaAuthenticationResponse {
  @ApiProperty({
    description: 'The challenge string for the MFA device authentication',
  })
  id?: string;

  @ApiProperty({
    description: 'The challenge string for the MFA device registration',
  })
  challenge: string;

  @ApiProperty({
    enum: MfaStatus,
    example: MfaStatus.not_registered,
    description: 'Status of the MFA device registration on the server',
  })
  status: MfaStatus;
}

class MfaCredentialDto {
  @ApiProperty({
    description: 'The challenge string for the MFA device authentication',
  })
  @IsString()
  publicKey: string;

  @ApiProperty({
    description: 'The challenge string for the MFA device registration',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'The challenge string for the MFA device registration',
  })
  @IsString()
  algorithm: 'RS256' | 'ES256';
}

export class CreateMfaAuthenticationDto {
  @ApiProperty({
    description: 'The username of the user to authenticate',
  })
  @IsString()
  username: string;
  @ApiProperty({
    description: 'MFA Credential',
  })
  credential: MfaCredentialDto;
  @ApiProperty({
    description: 'The authenticator data',
  })
  @IsString()
  authenticatorData: string;
  @ApiProperty({
    description: 'The client data',
  })
  @IsString()
  clientData: string;
  @ApiProperty({
    description: 'The signature',
  })
  @IsString()
  @IsOptional()
  attestationData?: string;
}
