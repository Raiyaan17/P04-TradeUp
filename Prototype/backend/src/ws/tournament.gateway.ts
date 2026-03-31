import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import { OracleService } from '../oracle/oracle.service';

@WebSocketGateway({
  namespace: '/tournament',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class TournamentGateway implements OnGatewayInit, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly oracleService: OracleService) {}

  afterInit(server: Server) {
    console.log('TournamentGateway Initialized');
  }

  onModuleInit() {
    this.oracleService.setTickCallback((tick, news, leaderboard) => {
      this.server.emit('tournamentTick', {
        tick,
        news,
        leaderboard,
      });
    });
  }
}
