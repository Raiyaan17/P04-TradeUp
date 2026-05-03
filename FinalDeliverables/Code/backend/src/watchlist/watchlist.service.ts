import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURED_SYMBOLS } from '../common/constants';

@Injectable()
export class WatchlistService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureFeatured(symbol: string) {
    if (!(FEATURED_SYMBOLS as readonly string[]).includes(symbol)) {
      throw new BadRequestException(
        'Only featured symbols are allowed in Phase 1',
      );
    }
  }

  async list(userId: number) {
    const items = await this.prisma.watchlistItem.findMany({
      where: { userId },
      include: { stock: true },
      orderBy: { createdAt: 'asc' },
    });
    return items.map((i) => ({ symbol: i.stock.symbol, addedAt: i.createdAt }));
  }

  async add(userId: number, symbol: string) {
    this.ensureFeatured(symbol);
    const stock = await this.prisma.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol, marketType: 'REG' },
    });
    await this.prisma.watchlistItem.create({
      data: { userId, stockId: stock.id },
    });
    return { ok: true };
  }

  async remove(userId: number, symbol: string) {
    const stock = await this.prisma.stock.findUnique({ where: { symbol } });
    if (!stock) return { ok: true };
    await this.prisma.watchlistItem.delete({
      where: { userId_stockId: { userId, stockId: stock.id } },
    });
    return { ok: true };
  }
}
