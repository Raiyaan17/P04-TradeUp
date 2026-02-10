import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

type UpdateBalanceDto = {
  amount: number;
  userId: number;
};
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Upload profile picture, save URL in DB, and return public URL
  async uploadProfilePicture(
    id: number,
    fileBuffer: Buffer,
    fileName: string,
    contentType?: string,
  ): Promise<string> {
    const filePath = `${id}/${fileName}`;
    const finalContentType = contentType || 'image/png';
    const { error } = await supabase.storage
      .from('TradeUp-profile-images')
      .upload(filePath, fileBuffer, {
        upsert: true,
        contentType: finalContentType,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage
      .from('TradeUp-profile-images')
      .getPublicUrl(filePath);

    // Save the public URL to the user record in Neon DB
    await this.prisma.user.update({
      where: { id },
      data: { profileImageUrl: data.publicUrl },
    });

    return data.publicUrl;
  }

  //! Add Funds
  // Update user's wallet balance
  async updateBalance({ userId, amount }: UpdateBalanceDto) {
    //if balance is -1, increment by amount + 1
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.balance.toNumber() === -1) {
      return this.prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount + 1 } },
      });
    }
    //else increment by amount
    else {
      return this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
    }
  }

  // Fetch profile picture public URL from Neon DB
  async getProfilePictureUrl(id: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { profileImageUrl: true },
    });
    return user?.profileImageUrl || null;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async searchByUsername(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        username: {
          contains: query,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        profileImageUrl: true,
      },
      take: limit,
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    role?: 'TRADER' | 'ADMIN';
    gender?: 'MALE' | 'FEMALE';
  }) {
    return this.prisma.user.create({ data });
  }

  async ensureDefaultProfileImage(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true, gender: true },
    });

    if (!user || user.profileImageUrl || !user.gender) {
      return;
    }

    const defaultAvatarUrl =
      user.gender === 'MALE'
        ? '/avatars/default-male.svg'
        : '/avatars/default-female.svg';

    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: defaultAvatarUrl },
    });
  }

  async updateEmail(userId: number, newEmail: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async updatePassword(userId: number, newPasswordHash: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async updateName(userId: number, newName: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: newName },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async emailExists(email: string, excludeUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) return false;
    if (excludeUserId && user.id === excludeUserId) return false;
    return true;
  }

  async usernameExists(username: string, excludeUserId?: number) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) return false;
    if (excludeUserId && user.id === excludeUserId) return false;
    return true;
  }
}
