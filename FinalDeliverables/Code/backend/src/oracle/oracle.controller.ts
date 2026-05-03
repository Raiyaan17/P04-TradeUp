import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { OracleService } from './oracle.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

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
  async getPortfolio(
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
  ) {
    return this.oracleService.getPortfolio(req.user.userId);
  }

  @Get(':id/analysis')
  async getTournamentAnalysis(
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
    @Param('id') tournamentId: string,
  ) {
    return this.oracleService.getParticipantAnalysis(
      req.user.userId,
      tournamentId,
    );
  }

  @Post('start')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async startTournament(
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
    @Body('startingCash') startingCash: number,
    @Body('speed') speed?: 'normal' | 'fast',
  ) {
    return this.oracleService.startTournament(
      req.user.userId,
      startingCash,
      speed || 'normal',
    );
  }

  @Post('join')
  async joinTournament(
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
    @Body('tournamentId') tournamentId: string,
  ) {
    return this.oracleService.joinTournament(req.user.userId, tournamentId);
  }

  @Post('buy')
  async buyStock(
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
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
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
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
    // @ts-ignore
    @Req() req: import('../types/request.type').AuthenticatedRequest,
    @Body('tournamentId') tournamentId: string,
  ) {
    return this.oracleService.endTournament(req.user.userId, tournamentId);
  }
}
