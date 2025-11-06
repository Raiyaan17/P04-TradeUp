import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StocksService } from '../stocks/stocks.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocks: StocksService,
  ) {}

  async buyStock(userId: number, symbol: string, quantity: number) {
    const tick = await this.stocks.getTick(symbol);
    if (!tick || typeof tick.price !== 'number') {
      throw new NotFoundException(
        `Pricing information for stock '${symbol}' not available.`,
      );
    }

    const price = new Decimal(tick.price);
    const totalCost = price.mul(quantity);

    const stock = await this.stocks.findOrCreateStock(symbol);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      if (user.balance.lessThan(totalCost)) {
        throw new BadRequestException('Insufficient balance.');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: totalCost } },
      });

      const portfolioItem = await tx.portfolio.findUnique({
        where: { userId_stockId: { userId, stockId: stock.id } },
      });

      let newAvgPrice: Decimal;
      if (portfolioItem) {
        const oldTotalValue = portfolioItem.avgPrice.mul(
          portfolioItem.quantity,
        );
        const newTotalValue = price.mul(quantity);
        const totalQuantity = portfolioItem.quantity + quantity;
        newAvgPrice = oldTotalValue.add(newTotalValue).div(totalQuantity);
      } else {
        newAvgPrice = price;
      }

      const updatedPortfolioItem = await tx.portfolio.upsert({
        where: { userId_stockId: { userId, stockId: stock.id } },
        update: {
          quantity: { increment: quantity },
          avgPrice: newAvgPrice,
        },
        create: {
          userId,
          stockId: stock.id,
          quantity,
          avgPrice: price,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          stockId: stock.id,
          type: 'BUY',
          quantity,
          price,
          total: totalCost,
        },
      });

      return {
        user: updatedUser,
        portfolioItem: updatedPortfolioItem,
        transaction,
      };
    });
  }

  async sellStock(userId: number, symbol: string, quantity: number) {
    const tick = await this.stocks.getTick(symbol);
    if (!tick || typeof tick.price !== 'number') {
      throw new NotFoundException(
        `Pricing information for stock '${symbol}' not available.`,
      );
    }

    const price = new Decimal(tick.price);
    const totalSale = price.mul(quantity);

    const stock = await this.stocks.findOrCreateStock(symbol);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      const portfolioItem = await tx.portfolio.findUnique({
        where: { userId_stockId: { userId, stockId: stock.id } },
      });

      if (!portfolioItem) {
        throw new BadRequestException(
          `You do not own any shares of '${symbol}'.`,
        );
      }

      if (portfolioItem.quantity < quantity) {
        throw new BadRequestException(
          `Insufficient shares. You own ${portfolioItem.quantity} shares but tried to sell ${quantity}.`,
        );
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: totalSale } },
      });

      let updatedPortfolioItem;
      const remainingQuantity = portfolioItem.quantity - quantity;

      if (remainingQuantity === 0) {
        await tx.portfolio.delete({
          where: { userId_stockId: { userId, stockId: stock.id } },
        });
        updatedPortfolioItem = null;
      } else {
        updatedPortfolioItem = await tx.portfolio.update({
          where: { userId_stockId: { userId, stockId: stock.id } },
          data: { quantity: { decrement: quantity } },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          userId,
          stockId: stock.id,
          type: 'SELL',
          quantity,
          price,
          total: totalSale,
        },
      });

      return {
        user: updatedUser,
        portfolioItem: updatedPortfolioItem,
        transaction,
      };
    });
  }
}
