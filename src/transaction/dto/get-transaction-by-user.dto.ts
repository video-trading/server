import { TransactionHistory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsString } from 'class-validator';

export enum TransactionType {
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
}

export class GetTransactionByUserDto implements TransactionHistory {
  @ApiProperty({
    description: 'Id of the transaction',
  })
  @IsString()
  id: string;
  @ApiProperty({
    description: 'Created at',
  })
  @IsDate()
  createdAt: Date;
  @ApiProperty({
    description: 'Updated at',
  })
  @IsDate()
  updatedAt: Date;
  @ApiProperty({
    description: 'Transaction hash',
  })
  @IsString()
  txHash: string;
  @ApiProperty({
    description: 'Value of the transaction',
  })
  @IsString()
  value: string;
  @ApiProperty({
    description: 'Video id',
  })
  @IsString()
  videoId: string;
  @ApiProperty({
    description: 'From user id',
  })
  @IsString()
  fromId: string;
  @ApiProperty({
    description: 'To user id',
  })
  @IsString()
  toId: string;

  @ApiProperty({
    description: 'Type of the transaction',
    enum: TransactionType,
  })
  @IsEnum(TransactionType)
  type: TransactionType;
}
