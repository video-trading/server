import {
  BadRequestException,
  Body,
  Controller,
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

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {
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
}
