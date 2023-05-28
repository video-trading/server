import { CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

export class MfaGuard implements CanActivate {
  constructor(
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    @InjectRedis() private readonly redis: Redis,
    private readonly authService: AuthService,
  ) {
    // eslint-disable-next-line prettier/prettier
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { userId: string } }>();

    if (!user) {
      return false;
    }

    const key = this.authService.getRedisKey(user.userId, 'authenticated');

    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}
