import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BuyStockDto } from './dto/buy-stock.dto';
import { SellStockDto } from './dto/sell-stock.dto';
import { TradesService } from './trades.service';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  buyStock(@Request() req, @Body() buyStockDto: BuyStockDto) {
    const userId = req.user.userId;
    const { symbol, quantity } = buyStockDto;
    return this.tradesService.buyStock(userId, symbol, quantity);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sell')
  sellStock(@Request() req, @Body() sellStockDto: SellStockDto) {
    const userId = req.user.userId;
    const { symbol, quantity } = sellStockDto;
    return this.tradesService.sellStock(userId, symbol, quantity);
  }
}
