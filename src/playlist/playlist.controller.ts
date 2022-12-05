import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth-guard';
import { Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { AddVideoDto } from './dto/add-video.dto';
import { DeleteVideoDto } from './dto/delete-video.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { PaginationSchema } from '../common/pagination';
import { GetPlaylistDetailsDto } from './dto/get-playlist.dto';

@Controller('playlist')
@ApiTags('playlist')
export class PlaylistController {
  constructor(private playlistService: PlaylistService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiExtraModels(GetPlaylistDetailsDto)
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Find playlist by user id',
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                $ref: getSchemaPath(GetPlaylistDetailsDto),
              },
            },
          },
        },
        PaginationSchema,
      ],
    },
  })
  findAll(
    @Request() req,
    @Query('per') per: number,
    @Query('page') page: number,
  ) {
    return this.playlistService.findAll(req.user.userId, page, per);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 201,
    description: 'Create a playlist',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        videoId: {
          type: 'string',
        },
      },
    },
  })
  create(@Request() req, @Body() body: CreatePlaylistDto) {
    return this.playlistService.create(body, req.user.userId);
  }

  @Get(':id')
  @ApiExtraModels(GetPlaylistDetailsDto)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Playlist id',
  })
  @ApiResponse({
    status: 200,
    description: 'Find playlist by id',
    schema: {
      allOf: [
        {
          $ref: getSchemaPath(GetPlaylistDetailsDto),
        },
        PaginationSchema,
      ],
    },
  })
  findOne(
    @Param('id') id: string,
    @Query('per') per: number,
    @Query('page') page: number,
  ) {
    return this.playlistService.findOne(id, page, per);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Playlist id',
  })
  @ApiResponse({
    status: 200,
    description: 'Update playlist by id',
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdatePlaylistDto,
    @Request() req,
  ) {
    return this.playlistService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Playlist id',
  })
  @ApiResponse({
    status: 200,
    description: 'Delete playlist by id',
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.playlistService.delete(id, req.user.userId);
  }

  @Patch(':id/video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Playlist id',
  })
  @ApiResponse({
    status: 200,
    description: 'Add video to playlist by id',
  })
  addVideo(@Param('id') id: string, @Body() body: AddVideoDto, @Request() req) {
    return this.playlistService.addVideo(id, body.videoId, req.user.userId);
  }

  @Delete(':id/video')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiParam({
    name: 'id',
    description: 'Playlist id',
  })
  @ApiResponse({
    status: 200,
    description: 'Remove video from playlist by id',
  })
  removeVideo(
    @Param('id') id: string,
    @Body() body: DeleteVideoDto,
    @Request() req,
  ) {
    return this.playlistService.removeVideo(id, body.videoId, req.user.userId);
  }
}
