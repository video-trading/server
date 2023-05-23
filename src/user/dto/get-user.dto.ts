import { ApiProperty } from '@nestjs/swagger';
class GetUserWalletResponse {
  id: string;
  @ApiProperty({
    description: 'User wallet address',
  })
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GetUserResponse {
  @ApiProperty({
    description: 'User id',
  })
  id: string;
  @ApiProperty({
    description: 'User email',
  })
  email: string;
  @ApiProperty({
    description: 'User name',
  })
  name: string;
  @ApiProperty({
    description: 'User name',
  })
  username: string;
  @ApiProperty({
    description: 'Created date',
  })
  createdAt: Date;
  @ApiProperty({
    description: 'Updated date',
  })
  updatedAt: Date;
  @ApiProperty({
    description: 'User avatar',
  })
  avatar: string;
  @ApiProperty({
    description: "User's short description",
  })
  shortDescription: string;
  @ApiProperty({
    description: "User's long description",
  })
  longDescription: string;
  version: number;
  walletId: string;
  @ApiProperty({
    description: 'User wallet',
  })
  Wallet: GetUserWalletResponse;
}
