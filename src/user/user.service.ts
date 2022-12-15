import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { BlockchainService } from '../blockchain/blockchain.service';
import { StorageService } from '../storage/storage.service';
import axios from 'axios';

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
    const previousUser = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (updateUserDto.avatar && updateUserDto.avatar !== previousUser.avatar) {
      const exists = await this.storage.checkIfAvatarExists(
        updateUserDto.avatar,
      );
      if (!exists) {
        throw new BadRequestException('Avatar does not exist');
      }
    }

    // only allows updating email, name and avatar
    const user = this.prisma.user.update({
      where: {
        id,
      },
      data: {
        email: updateUserDto.email,
        name: updateUserDto.name,
        avatar: updateUserDto.avatar,
        shortDescription: updateUserDto.shortDescription,
        longDescription: updateUserDto.longDescription,
        version: {
          increment: 1,
        },
      },
    });

    if (previousUser.avatar !== updateUserDto.avatar) {
      // if avatar is updated, delete the previous avatar
      await this.storage.deleteFile(previousUser.avatar);
    }

    return user;
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
      include: {
        Wallet: true,
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

  /**
   * Generate an avatar using image generator service
   * @param userId
   */
  async generateAvatar(userId: string) {
    const user = await this.findOne(userId);
    const generationEndpoint =
      process.env.IMAGE_GENERATOR_ENDPOINT + '/api/dev/dev_text_to_image';
    const avatar = await axios.post(generationEndpoint, {
      prompt: user.name,
      width: 512,
      height: 512,
      number_of_image: 1,
      random_seed: true,
      token: process.env.IMAGE_GENERATOR_API_KEY,
    });

    const imageUrl =
      process.env.IMAGE_GENERATOR_ENDPOINT + avatar.data.data.list_image[0];
    const image = await axios.get(imageUrl, {
      responseType: 'text',
      responseEncoding: 'base64',
    });
    const imageData = image.data;
    return imageData;
  }
}
