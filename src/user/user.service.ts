import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
  ) {
    // ...
  }

  hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  comparePassword(password: string, hashedPassword: string) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Create a new user
   * @param createUserDto
   */
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await this.hashPassword(createUserDto.password);
    const wallet = await this.blockchainService.createWallet();
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
        username: createUserDto.username,
        Wallet: {
          create: {
            address: wallet.address,
            privateKey: wallet.privateKey,
          },
        },
      },
    });
    await this.blockchainService.requestMoney(wallet.address);
    const foundUser = await this.prisma.user.findUnique({
      where: {
        id: user.id,
      },
      include: {
        Wallet: true,
      },
    });

    return {
      ...foundUser,
      password: undefined,
      Wallet: {
        ...foundUser.Wallet,
        privateKey: undefined,
      },
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        email: updateUserDto.email,
        name: updateUserDto.name,
      },
    });
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  findOneBy(username: string) {
    return this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }
}
