import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiAcceptedResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {
  }

  @Patch(':id')
  @ApiAcceptedResponse({
    description:
      'Update user by user id. Keep in mind that user cannot update its password and username using this function',
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
}
