import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { SearchMentionDto } from './dto/search-mention.dto';
import { PostTag } from '@prisma/client';

type UploadedFileType = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
    role: 'TRADER' | 'ADMIN';
  };
}

@ApiTags('Community')
@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  constructor(private readonly community: CommunityService) {}

  // ─── POSTS ──────────────────────────────────────────────────────────

  @Post('posts')
  async createPost(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePostDto,
  ) {
    return this.community.createPost(
      req.user.userId,
      dto.title,
      dto.content,
      (dto.tag as PostTag) ?? 'GENERAL',
      dto.imageUrl,
    );
  }

  @Get('posts')
  async getPosts(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tag') tag?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const postTag =
      tag && Object.values(PostTag).includes(tag as PostTag)
        ? (tag as PostTag)
        : undefined;

    return this.community.getPosts(req.user.userId, pageNum, limitNum, postTag);
  }

  @Get('posts/:id')
  async getPost(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.getPostById(id, req.user.userId);
  }

  @Delete('posts/:id')
  async deletePost(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.deletePost(id, req.user.userId);
  }

  // ─── COMMENTS & REPLIES ─────────────────────────────────────────────

  @Post('comments')
  async createComment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.community.createComment(
      req.user.userId,
      dto.postId,
      dto.content,
      dto.parentId,
      dto.imageUrl,
    );
  }

  @Get('posts/:id/comments')
  async getComments(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.community.getComments(postId, req.user.userId);
  }

  @Delete('comments/:id')
  async deleteComment(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.community.deleteComment(id, req.user.userId);
  }

  // ─── REACTIONS ──────────────────────────────────────────────────────

  @Post('reactions')
  async toggleReaction(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.community.toggleReaction(
      req.user.userId,
      dto.postId,
      dto.type as unknown as import('@prisma/client').ReactionType,
    );
  }

  // ─── BLOCK / MUTE ──────────────────────────────────────────────────

  @Post('block')
  async blockUser(@Req() req: AuthenticatedRequest, @Body() dto: BlockUserDto) {
    return this.community.blockUser(req.user.userId, dto.blockedId);
  }

  @Delete('block/:id')
  async unblockUser(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) blockedId: number,
  ) {
    return this.community.unblockUser(req.user.userId, blockedId);
  }

  @Get('blocked')
  async getBlockedUsers(@Req() req: AuthenticatedRequest) {
    return this.community.getBlockedUsers(req.user.userId);
  }

  // ─── USER MENTIONS ──────────────────────────────────────────────────

  @Post('mentions/search')
  async searchMentions(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SearchMentionDto,
  ) {
    return this.community.searchMentions(
      req.user.userId,
      dto.query,
      10, // default limit
    );
  }

  // ─── SAVED POSTS ────────────────────────────────────────────────────

  @Post('posts/:id/save')
  async savePost(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    return this.community.savePost(req.user.userId, postId);
  }

  @Get('saved-posts')
  async getSavedPosts(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.community.getSavedPosts(req.user.userId, pageNum, limitNum);
  }

  @Get('posts/:id/is-saved')
  async isPostSaved(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) postId: number,
  ) {
    const isSaved = await this.community.isPostSaved(
      req.user.userId,
      postId,
    );
    return { isSaved };
  }

  // ─── IMAGE UPLOAD ──────────────────────────────────────────────────

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload community image' })
  async uploadImage(
    @Req() req: AuthenticatedRequest & { isMultipart: () => boolean, file: () => Promise<any> },
  ) {
    if (!req.isMultipart || !req.isMultipart()) {
      throw new Error('Request is not multipart');
    }
    const file = await req.file();
    if (!file) {
      throw new Error('No file uploaded');
    }
    try {
      const buffer = await file.toBuffer();
      const imageUrl = await this.community.uploadImage(
        req.user.userId,
        buffer,
        file.filename,
        file.mimetype,
      );
      return { imageUrl };
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }
}
