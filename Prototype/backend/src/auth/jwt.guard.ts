import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface JwtUser {
  userId: number;
  email: string;
  role: 'TRADER' | 'ADMIN';
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUser>(
    err: Error | null,
    user: TUser,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _info: Error | null,
  ): TUser {
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}
