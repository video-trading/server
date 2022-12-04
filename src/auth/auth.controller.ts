import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {
    // eslint-disable-next-line prettier/prettier
  }

  @Post('signUp')
  async signup(
    @Body() body: CreateUserDto,
  ): Promise<{ user: any; accessToken: string }> {
    const user = await this.authService.signUp(body);
    const loginedUser = await this.authService.accessToken(user);
    return {
      user,
      accessToken: loginedUser,
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('signIn')
  async login(@Request() req): Promise<{ user: any; accessToken: string }> {
    const loginedUser = await this.authService.accessToken(req.user);
    return {
      user: req.user,
      accessToken: loginedUser,
    };
  }
}
