import { OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FEATURED_SYMBOLS } from '../common/constants';
import { StocksService } from '../stocks/stocks.service';

interface TickUpdateMessage {
  type: string;
  symbol?: string;
  [key: string]: unknown;
}

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://p04-trade-up.vercel.app',
      'https://p04-trade-up1.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST'],
  },
})
export class MarketGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly stocksService: StocksService) {}

  onModuleInit() {
    this.startPollingFallback();
  }

  @SubscribeMessage('subscribeSymbol')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() symbol: string,
  ) {
    if (!(FEATURED_SYMBOLS as readonly string[]).includes(symbol)) {
      return;
    }
    void socket.join(`symbol:${symbol}`);
    socket.emit('subscribed', { symbol });
  }

  private getActiveSubscribedSymbols(): string[] {
    if (!this.server?.sockets?.adapter?.rooms) return [];
    const activeSymbols: string[] = [];
    const rooms = this.server.sockets.adapter.rooms;

    for (const [roomName, clients] of rooms.entries()) {
      if (
        typeof roomName === 'string' &&
        roomName.startsWith('symbol:') &&
        clients.size > 0
      ) {
        const symbol = roomName.replace('symbol:', '');
        if ((FEATURED_SYMBOLS as readonly string[]).includes(symbol)) {
          activeSymbols.push(symbol);
        }
      }
    }
    return activeSymbols;
  }

  private startPollingFallback() {
    console.log(
      '[MarketGateway] Upstream WebSocket disabled. Starting REST API polling fallback...',
    );

    setInterval(async () => {
      try {
        const symbolsToPoll = this.getActiveSubscribedSymbols();
        if (symbolsToPoll.length === 0) return;

        // Fetch updates in small batches to respect rate limits
        const batchSize = 5;
        for (let i = 0; i < symbolsToPoll.length; i += batchSize) {
          const batch = symbolsToPoll.slice(i, i + batchSize);

          await Promise.all(
            batch.map(async (symbol) => {
              try {
                // Pass forceFetch=true to bypass the local cache and hit the REST API
                const tick = await this.stocksService.getTick(
                  symbol,
                  'REG',
                  true,
                );
                if (tick) {
                  // Emit the updated tick to all clients in the room
                  const msg: TickUpdateMessage = {
                    type: 'tickUpdate',
                    symbol,
                    tick,
                  };
                  this.server.to(`symbol:${symbol}`).emit('tickUpdate', msg);
                }
              } catch (err) {
                // Ignore individual fetch errors so polling continues
              }
            }),
          );

          // Delay between batches to respect upstream rate limits
          if (i + batchSize < symbolsToPoll.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (err) {
        console.error(
          '[MarketGateway] Error in polling fallback:',
          (err as Error).message,
        );
      }
    }, 10000); // Poll active subscriptions every 10 seconds
  }
}
