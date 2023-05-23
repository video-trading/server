import { ApiProperty } from '@nestjs/swagger';
import { GetUserResponse } from '../../user/dto/get-user.dto';

export class SignInResponse {
  @ApiProperty({
    description: 'User object',
  })
  user: GetUserResponse;
  @ApiProperty({
    description: 'JWT Access token',
  })
  accessToken: string;
}
