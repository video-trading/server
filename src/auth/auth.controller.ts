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
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private authService: AuthService) {
    // eslint-disable-next-line prettier/prettier
  }

  @Post('signUp')
  async signup(
    @Body() body: CreateUserDto,
  ): Promise<{ user: any; accessToken: string }> {
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
      console.log(e);
      throw new Error('Something went wrong');
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('signIn')
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
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            username: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            Wallet: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                },
              },
            },
          },
        },
        accessToken: {
          type: 'string',
        },
      },
    },
  })
  async signIn(@Request() req): Promise<{ user: any; accessToken: string }> {
    const loginedUser = await this.authService.accessToken(req.user);
    return {
      user: req.user,
      accessToken: loginedUser,
    };
  }
}
