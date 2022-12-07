import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Operation, StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get('id/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiAcceptedResponse({
    description:
      'Returns a pre-signed url for user to upload avatar. After uploading the avatar, user should call update function to update the avatar',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
        },
        key: {
          type: 'string',
        },
        previewUrl: {
          type: 'string',
        },
      },
    },
  })
  async createAvatar(@Request() request): Promise<{
    key: string;
    url: string;
    previewUrl: string;
  }> {
    const user = await this.userService.findOne(request.user.userId);
    const { key, url, previewUrl } =
      await this.storage.generatePreSignedUrlForAvatar(user, Operation.PUT);
    return {
      key,
      url,
      previewUrl,
    };
  }

  @Post('avatar/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Auto generate avatar using username',
  })
  async generateAvatar(@Request() request): Promise<any> {
    const avatar = await this.userService.generateAvatar(request.user.userId);
    const data = await this.storage.uploadAvatar(request.user.userId, avatar);
    return {
      ...data,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Returns user profile',
    type: UpdateUserDto,
  })
  async profile(@Request() request): Promise<any> {
    const profile = await this.userService.findOne(request.user.userId);

    if (!profile) {
      throw new UnauthorizedException();
    }

    if (profile.avatar) {
      const avatar = await this.storage.generatePreSignedUrlForAvatar(
        profile,
        Operation.GET,
      );

      return {
        ...profile,
        avatar,
      };
    }
    return profile;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiAcceptedResponse({
    description:
      'Update user profile by user id. Keep in mind that user cannot update its password and username using this function',
    type: UpdateUserDto,
  })
  updateProfile(@Request() request, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(request.user.userId, updateUserDto);
  }
}
