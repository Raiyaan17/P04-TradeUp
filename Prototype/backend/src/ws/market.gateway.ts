import { OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';
import { FEATURED_SYMBOLS, PSX_WS_URL } from '../common/constants';

@WebSocketGateway({ namespace: '/ws', cors: true })
export class MarketGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private upstream?: WebSocket;

  onModuleInit() {
    this.connectUpstream();
  }

  // Client asks to receive updates for a single symbol (must be in FEATURED_SYMBOLS for Phase 1)
  @SubscribeMessage('subscribeSymbol')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() symbol: string,
  ) {
    if (!FEATURED_SYMBOLS.includes(symbol as any)) {
      return;
    }
    socket.join(`symbol:${symbol}`);
    socket.emit('subscribed', { symbol });
  }

  private connectUpstream() {
    const ws = new WebSocket(PSX_WS_URL);
    this.upstream = ws;

    ws.on('open', () => {
      for (const symbol of FEATURED_SYMBOLS) {
        const msg = {
          type: 'subscribe',
          subscriptionType: 'marketData',
          params: { marketType: 'REG', symbol },
          requestId: `sub-${symbol}`,
        };
        ws.send(JSON.stringify(msg));
      }
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg?.type === 'tickUpdate' && msg?.symbol) {
          // emit only to clients subscribed to this symbol
          console.log(msg);
          this.server.to(`symbol:${msg.symbol}`).emit('tickUpdate', msg);
        }
      } catch {}
    });

    ws.on('close', () => {
      setTimeout(() => this.connectUpstream(), 2000);
    });

    ws.on('error', () => {
      try {
        ws.close();
      } catch {}
    });
  }
}
