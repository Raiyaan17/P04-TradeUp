import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

function maskUserId(userId: number): string {
  const str = String(userId);
  return '***' + str.slice(-2);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signup(
    email: string,
    username: string,
    password: string,
    role: 'TRADER' | 'ADMIN' = 'TRADER',
    gender: 'MALE' | 'FEMALE',
  ) {
    const masked = maskEmail(email);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      this.logger.warn(`Signup rejected: email already exists [${masked}]`);
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.users.findByUsername(username);
    if (existingUsername) {
      this.logger.warn(
        `Signup rejected: username already exists [${username}]`,
      );
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.users.create({
      email,
      username,
      passwordHash,
      role,
      gender,
    });

    this.logger.log(
      `User created [userId=${maskUserId(user.id)}, email=${masked}, username=${username}, role=${role}, gender=${gender}]`,
    );

    return this.sign(user.id, user.email, user.role as 'TRADER' | 'ADMIN');
  }

  async login(email: string, password: string) {
    const masked = maskEmail(email);
    const user = await this.users.findByEmail(email);

    if (!user) {
      this.logger.warn(`Login failed: user not found [${masked}]`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn(
        `Login failed: invalid password [userId=${maskUserId(user.id)}, email=${masked}]`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug(
      `Ensuring default profile image [userId=${maskUserId(user.id)}]`,
    );
    await this.users.ensureDefaultProfileImage(user.id);

    this.logger.log(
      `Login successful [userId=${maskUserId(user.id)}, email=${masked}, role=${user.role}]`,
    );

    return this.sign(user.id, user.email, user.role as 'TRADER' | 'ADMIN');
  }

  private async sign(sub: number, email: string, role: 'TRADER' | 'ADMIN') {
    const access_token = await this.jwt.signAsync({ sub, email, role });
    return { access_token };
  }
}
