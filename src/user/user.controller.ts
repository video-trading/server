import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiAcceptedResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Operation, StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly storage: StorageService,
  ) {}

  @Patch(':id')
  @ApiAcceptedResponse({
    description:
      'Update user by user id. Keep in mind that user cannot update its password and username using this function',
    type: UpdateUserDto,
  })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
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
        preSignedUrl: {
          type: 'string',
        },
      },
    },
  })
  async createAvatar(@Request() request): Promise<{
    preSignedUrl: string;
  }> {
    const user = await this.userService.findOne(request.user.userId);
    return {
      preSignedUrl: await this.storage.generatePreSignedUrlForAvatar(
        user,
        Operation.PUT,
      ),
    };
  }
}
