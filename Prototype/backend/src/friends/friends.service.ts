import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendRequest(senderId: number, receiverId: number) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // Check if friendship already exists (in either direction)
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException('Already friends');
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException('Friend request already pending');
      }
      // If DECLINED, allow resending by updating the existing record
      if (existing.status === 'DECLINED') {
        return this.prisma.friendship.update({
          where: { id: existing.id },
          data: { status: 'PENDING', senderId, receiverId },
        });
      }
    }

    return this.prisma.friendship.create({
      data: { senderId, receiverId },
    });
  }

  async getPendingRequests(userId: number) {
    return this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptRequest(requestId: number, userId: number) {
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('Cannot accept this request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is not pending');
    }

    return this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });
  }

  async declineRequest(requestId: number, userId: number) {
    const request = await this.prisma.friendship.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException('Cannot decline this request');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is not pending');
    }

    return this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
    });
  }

  async getFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return the friend (not the current user) from each friendship
    return friendships.map((f) =>
      f.senderId === userId ? f.receiver : f.sender,
    );
  }

  async removeFriend(friendId: number, userId: number) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { ok: true };
  }

  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });
    return !!friendship;
  }
}
