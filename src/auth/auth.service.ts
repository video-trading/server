import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { config } from '../common/utils/config/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    // eslint-disable-next-line prettier/prettier
  }

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
    });
  }

  async signUp(user: CreateUserDto) {
    return this.userService.create(user);
  }
}
