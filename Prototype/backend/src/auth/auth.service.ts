import { Injectable, UnauthorizedException, ConflictException} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService) {}

  async signup(email: string, password: string, role: 'TRADER' | 'ADMIN' = 'TRADER') {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.create({ email, passwordHash, role });

    return this.sign(user.id, user.email, user.role as 'TRADER' | 'ADMIN');
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.sign(user.id, user.email, user.role as 'TRADER' | 'ADMIN');
  }

  private async sign(sub: number, email: string, role: 'TRADER' | 'ADMIN') {
    const access_token = await this.jwt.signAsync({ sub, email, role });
    return { access_token };
  }
}
