import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
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

  @Get('list')
  async getActiveTournaments() {
    return this.oracleService.getActiveTournaments();
  }

  @Get('portfolio')
  async getPortfolio(@Req() req: any) {
    return this.oracleService.getPortfolio(req.user.userId);
  }

  @Get(':id/analysis')
  async getTournamentAnalysis(
    @Req() req: any,
    @Param('id') tournamentId: string,
  ) {
    return this.oracleService.getParticipantAnalysis(req.user.userId, tournamentId);
  }

  @Post('start')
  async startTournament(
    @Req() req: any,
    @Body('startingCash') startingCash: number,
    @Body('speed') speed?: 'normal' | 'fast',
  ) {
    return this.oracleService.startTournament(req.user.userId, startingCash, speed || 'normal');
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

  @Post('end')
  async endTournament(
    @Req() req: any,
    @Body('tournamentId') tournamentId: string,
  ) {
    return this.oracleService.endTournament(req.user.userId, tournamentId);
  }
}
