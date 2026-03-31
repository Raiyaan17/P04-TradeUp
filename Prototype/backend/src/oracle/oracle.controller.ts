import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('oracle/tournament')
@UseGuards(JwtAuthGuard)
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Get('active')
  async getActiveTournament() {
    return this.oracleService.getActiveTournament();
  }

  @Post('start')
  async startTournament(
    @Req() req: any,
    @Body('startingCash') startingCash: number,
  ) {
    return this.oracleService.startTournament(req.user.userId, startingCash);
  }

  @Post('join')
  async joinTournament(
    @Req() req: any,
    @Body('tournamentId') tournamentId: string,
  ) {
    return this.oracleService.joinTournament(req.user.userId, tournamentId);
  }

  @Post('buy')
  async buyStock(
    @Req() req: any,
    @Body('tournamentId') tournamentId: string,
    @Body('stockSymbol') stockSymbol: string,
    @Body('quantity') quantity: number,
  ) {
    return this.oracleService.buyStock(
      req.user.userId,
      tournamentId,
      stockSymbol,
      quantity,
    );
  }

  @Post('sell')
  async sellStock(
    @Req() req: any,
    @Body('tournamentId') tournamentId: string,
    @Body('stockSymbol') stockSymbol: string,
    @Body('quantity') quantity: number,
  ) {
    return this.oracleService.sellStock(
      req.user.userId,
      tournamentId,
      stockSymbol,
      quantity,
    );
  }
}
