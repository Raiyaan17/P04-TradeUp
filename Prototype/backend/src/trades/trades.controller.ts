import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BuyStockDto } from './dto/buy-stock.dto';
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
}
