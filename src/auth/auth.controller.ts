import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from '../user/dto/create-user.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SignupResponse } from './dto/signup.dto';
import { SignInResponse } from './dto/signin.dto';
import {
  CreateMfaAuthenticationDto,
  GetMfaAuthenticationResponse,
} from './dto/mfa.dto';
import { RequestWithUser } from '../common/types';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { JwtAuthGuard } from './jwt-auth-guard';
import {
  CreateMfaAuthenticateDto,
  GetMfaAuthenticateResponse,
  GetMfaAuthenticateResponseSchema,
} from './dto/mfa.authenticate.dto';
import { config } from '../common/utils/config/config';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    // eslint-disable-next-line prettier/prettier
  }

  @ApiOperation({
    summary: 'Sign up',
    description: 'Sign up with username and password',
  })
  @ApiCreatedResponse({
    description: 'Signed up successfully',
    type: SignupResponse,
  })
  @ApiBadRequestResponse({
    description: 'Cannot sign up with the given username',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Username already exists',
        },
      },
    },
  })
  @Post('signUp')
  async signup(@Body() body: CreateUserDto): Promise<SignupResponse> {
    try {
      const user = await this.authService.signUp(body);
      const loginedUser = await this.authService.accessToken(user);
      return {
        user,
        accessToken: loginedUser,
      };
    } catch (e) {
      if (e.code === 'P2002') {
        throw new BadRequestException('Username already exists');
      }
      throw new Error('Something went wrong');
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('signIn')
  @ApiOperation({
    summary: 'Sign in',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
        },
        password: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in',
    type: SignInResponse,
  })
  async signIn(@Request() req): Promise<{ user: any; accessToken: string }> {
    const signInUser = await this.authService.accessToken(req.user);
    return {
      user: req.user,
      accessToken: signInUser,
    };
  }
  @Get('mfa/register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get MFA registration credentials',
  })
  @ApiOkResponse({
    description: 'MFA registration credentials',
    type: GetMfaAuthenticationResponse,
  })
  async getMfaRegistrationCredentials(
    @Request() req: RequestWithUser,
  ): Promise<GetMfaAuthenticationResponse> {
    const key = this.authService.getRedisKey(req.user.userId, 'registration');
    // check if cached
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    // get mfa credentials
    const response = await this.authService.getMfaRegistrationCredentials(
      req.user.userId,
    );
    // save to cache
    await this.redis.set(key, JSON.stringify(response));
    // set ttl to 5 minutes
    await this.redis.expire(key, 60 * 5);
    return response;
  }
  @Post('mfa/register')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Register MFA device',
  })
  @ApiOkResponse({
    description: 'MFA device registered',
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'MFA device id',
        },
      },
    },
  })
  async registerMfaDevice(
    @Request() req: RequestWithUser,
    @Body() body: CreateMfaAuthenticationDto,
  ) {
    const response = await this.authService.createMfaAuthentication(
      req.user.userId,
      body,
    );

    // delete cached mfa registration credentials
    const key = this.authService.getRedisKey(req.user.userId, 'registration');
    await this.redis.del(key);
    return response;
  }

  @Get('mfa/authenticate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Authenticate MFA device',
  })
  @ApiOkResponse({
    description: 'MFA device authentication required data',
    type: GetMfaAuthenticateResponse,
  })
  async getMfaAuthenticate(@Request() req: RequestWithUser) {
    const key = this.authService.getRedisKey(req.user.userId, 'authentication');
    if (await this.redis.exists(key)) {
      return JSON.parse(await this.redis.get(key));
    }
    const response = await this.authService.getMfaAuthenticate(req.user.userId);
    this.redis.set(key, JSON.stringify(response));
    // set ttl to 5 minutes
    await this.redis.expire(key, config.mfaExpiration);
    return response;
  }

  @Post('mfa/authenticate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Verify MFA device',
  })
  @ApiOkResponse({
    description: 'MFA device authenticated',
    type: GetMfaAuthenticateResponse,
  })
  async verifyMfaAuthenticate(
    @Request() req: RequestWithUser,
    @Body() body: CreateMfaAuthenticateDto,
  ) {
    const key = this.authService.getRedisKey(req.user.userId, 'authentication');
    const challengeStr = await this.redis.get(key);
    if (!challengeStr) {
      throw new BadRequestException('Challenge expired');
    }
    const challenge = GetMfaAuthenticateResponseSchema.parse(
      JSON.parse(challengeStr),
    );
    const response = await this.authService.verifyMfaAuthenticate(
      req.user.userId,
      body,
      challenge.challenge,
    );
    const authenticatedKey = this.authService.getRedisKey(
      req.user.userId,
      'authenticated',
    );
    await this.redis.set(authenticatedKey, JSON.stringify(body));
    await this.redis.expire(authenticatedKey, config.mfaExpiration);
    return response;
  }
}
