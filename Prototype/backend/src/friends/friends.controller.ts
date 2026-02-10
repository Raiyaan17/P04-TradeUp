import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SendRequestDto } from './dto/send-request.dto';
import { UsersService } from '../users/users.service';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
    role: 'TRADER' | 'ADMIN';
  };
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(
    private readonly friends: FriendsService,
    private readonly users: UsersService,
  ) {}

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.users.searchByUsername(query);
  }

  @Post('request')
  async sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SendRequestDto,
  ) {
    await this.friends.sendRequest(req.user.userId, dto.receiverId);
    return { ok: true };
  }

  @Get('requests')
  async getRequests(@Req() req: AuthenticatedRequest) {
    return this.friends.getPendingRequests(req.user.userId);
  }

  @Put('request/:id/accept')
  async acceptRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.friends.acceptRequest(id, req.user.userId);
    return { ok: true };
  }

  @Put('request/:id/decline')
  async declineRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.friends.declineRequest(id, req.user.userId);
    return { ok: true };
  }

  @Get('check/:userId')
  async checkFriendship(
    @Req() req: AuthenticatedRequest,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const areFriends = await this.friends.areFriends(req.user.userId, userId);
    return { areFriends };
  }

  @Get()
  async getFriends(@Req() req: AuthenticatedRequest) {
    return this.friends.getFriends(req.user.userId);
  }

  @Delete(':id')
  async removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) friendId: number,
  ) {
    return this.friends.removeFriend(friendId, req.user.userId);
  }
}
