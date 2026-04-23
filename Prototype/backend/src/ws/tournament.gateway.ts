import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { OracleService } from '../oracle/oracle.service';

@WebSocketGateway({
  namespace: '/tournament',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class TournamentGateway
  implements OnGatewayInit, OnModuleInit, OnGatewayConnection
{
  @WebSocketServer()
  server!: Server;

  constructor(private readonly oracleService: OracleService) {}

  afterInit() {
    console.log('TournamentGateway Initialized');
  }

  async handleConnection(client: Socket) {
    const active = await this.oracleService.getActiveTournament();
    if (active) {
      const data = await this.oracleService.getCurrentTickData(active.id);
      if (data) {
        client.emit('tournamentTick', data);
      }
    }
  }

  onModuleInit() {
    this.oracleService.setTickCallback((tick, news, leaderboard) => {
      this.server.emit('tournamentTick', {
        tick,
        news,
        leaderboard,
      });
    });
    this.oracleService.setEndCallback((leaderboard) => {
      this.server.emit('tournamentEnd', leaderboard);
    });
  }
}
