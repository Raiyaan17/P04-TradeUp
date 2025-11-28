import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Upload profile picture, save URL in DB, and return public URL
  async uploadProfilePicture(id: number, fileBuffer: Buffer, fileName: string, contentType?: string): Promise<string> {
    const filePath = `${id}/${fileName}`;
  let finalContentType = contentType || 'image/png';
    const { error } = await supabase.storage
      .from('TradeUp-profile-images')
      .upload(filePath, fileBuffer, { upsert: true, contentType: finalContentType });

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

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    role?: 'TRADER' | 'ADMIN';
  }) {
    return this.prisma.user.create({ data });
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
}
