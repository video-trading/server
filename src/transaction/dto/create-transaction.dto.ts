import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction hash from payment gateway',
  })
  @IsString()
  txHash: string;
  @ApiProperty({
    description: 'Amount of the transaction',
  })
  @IsString()
  value: string;
  @ApiProperty({
    description: 'video id',
  })
  @IsString()
  videoId: string;
  @ApiProperty({
    description: 'user id of the user who is paying',
  })
  @IsString()
  fromUserId: string;
  @ApiProperty({
    description: 'user id of the user who is receiving the payment',
  })
  @IsString()
  toUserId: string;
}
