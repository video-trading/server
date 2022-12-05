import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Operation, StorageService } from '../storage/storage.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
    private readonly storage: StorageService,
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
    if (updateUserDto.avatar) {
      const exists = await this.storage.checkIfAvatarExists(
        updateUserDto.avatar,
      );
      if (!exists) {
        throw new BadRequestException('Avatar does not exist');
      }
    }

    // only allows updating email, name and avatar
    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        email: updateUserDto.email,
        name: updateUserDto.name,
        avatar: updateUserDto.avatar,
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

  async findOneBy(username: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
      },
      include: {
        Wallet: true,
      },
    });

    return {
      ...user,
      Wallet: {
        ...user.Wallet,
        privateKey: undefined,
      },
    };
  }
}
