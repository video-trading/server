import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { config } from '../common/utils/config/config';
import {
  CreateMfaAuthenticationDto,
  GetMfaAuthenticationResponse,
  GetMfaAuthenticationResponseSchema,
  MfaGetCredentialSchema,
  MfaStatus,
} from './dto/mfa.dto';
import { v4 } from 'uuid';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';

import { PrismaService } from '../prisma.service';
import {
  CreateMfaAuthenticateDto,
  GetMfaAuthenticateResponse,
} from './dto/mfa.authenticate.dto';
import { server } from 'webauthn';
import { Environments } from '../common/environment';
import { catchPrismaErrorDecorator } from '../decorators/catchPrismaDecorator';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    @InjectRedis() private readonly redis: Redis,
    private prismaService: PrismaService,
  ) {
    // eslint-disable-next-line prettier/prettier
  }

  @catchPrismaErrorDecorator()
  async validateUser(username: string, password: string) {
    const user = await this.userService.findOneBy(username);
    const isMatched = await this.userService.comparePassword(
      password,
      user.password,
    );
    if (isMatched) {
      const { password, ...result } = user;
      return result;
    }
    return undefined;
  }

  async accessToken(user: any) {
    const payload = { username: user.username, userId: user.id };
    return this.jwtService.sign(payload, {
      expiresIn: config.jwtTokenExpiration,
    });
  }

  async adminToken() {
    const payload = { username: 'admin', userId: 'admin' };
    return this.jwtService.sign(payload, {
      expiresIn: 3600 * 24 * 365 * 10,
      secret: Environments.jwt_secret,
    });
  }

  @catchPrismaErrorDecorator()
  async signUp(user: CreateUserDto) {
    return this.userService.create(user);
  }

  @catchPrismaErrorDecorator()
  async getMfaRegistrationCredentials(
    userId: string,
  ): Promise<GetMfaAuthenticationResponse> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const challenge = v4();

    if (!user.mfaCredential) {
      return {
        challenge,
        status: MfaStatus.not_registered,
      };
    }
    const mfaCredential = MfaGetCredentialSchema.parse(user.mfaCredential);

    return {
      id: mfaCredential.id,
      challenge,
      status: MfaStatus.registered,
    };
  }

  /**
   * Create MFA authentication
   * @param userId
   * @param data
   * @returns credential id
   */
  @catchPrismaErrorDecorator()
  async createMfaAuthentication(
    userId: string,
    data: CreateMfaAuthenticationDto,
  ) {
    const key = this.getRedisKey(userId, 'registration');
    const mfaSessionStr = await this.redis.get(key);
    if (!mfaSessionStr) {
      throw new BadRequestException('MFA session not found');
    }
    const mfaSession = JSON.parse(mfaSessionStr);
    const mfaCredential = GetMfaAuthenticationResponseSchema.parse(mfaSession);
    const registration = await server.verifyRegistration(data, {
      challenge: mfaCredential.challenge,
      origin: () => true,
    });

    await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        mfaCredential: registration.credential,
      },
    });
    return registration.credential.id;
  }

  /**
   * Get MFA authentication challenge and id
   * @param userId
   * @param data
   */
  @catchPrismaErrorDecorator()
  async getMfaAuthenticate(
    userId: string,
  ): Promise<GetMfaAuthenticateResponse> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    const challenge = v4();

    if (!user.mfaCredential) {
      throw new BadRequestException('MFA not registered');
    }
    const mfaCredential = MfaGetCredentialSchema.parse(user.mfaCredential);

    return {
      id: mfaCredential.id,
      challenge,
    };
  }

  @catchPrismaErrorDecorator()
  async verifyMfaAuthenticate(
    userId: string,
    data: CreateMfaAuthenticateDto,
    challenge: string,
  ) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const mfaCredential = MfaGetCredentialSchema.parse(user.mfaCredential);
    const registration = await server.verifyAuthentication(
      data,
      {
        publicKey: mfaCredential.publicKey,
        id: mfaCredential.id,
        algorithm: mfaCredential.algorithm,
      },
      {
        challenge: challenge,
        origin: () => true,
        userVerified: true,
        counter: -1,
      },
    );
    return registration;
  }

  @catchPrismaErrorDecorator()
  getRedisKey(
    userId: string,
    type: 'registration' | 'authentication' | 'authenticated',
  ) {
    return `mfa:${type}:${userId}`;
  }
}
