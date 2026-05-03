import { Body, Controller, Post, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length > 1 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const start = Date.now();
    const masked = maskEmail(dto.email);

    this.logger.log(
      `Signup request [email=${masked}, role=${dto.role ?? 'TRADER'}, gender=${dto.gender}]`,
    );

    try {
      const result = await this.auth.signup(
        dto.email,
        dto.username,
        dto.password,
        dto.role ?? 'TRADER',
        dto.gender,
      );
      const duration = Date.now() - start;
      this.logger.log(
        `Signup completed [email=${masked}, duration=${duration}ms]`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.warn(
        `Signup failed [email=${masked}, duration=${duration}ms, error=${(error as Error).message}]`,
      );
      throw error;
    }
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const start = Date.now();
    const masked = maskEmail(dto.email);

    this.logger.log(`Login request [email=${masked}]`);

    try {
      const result = await this.auth.login(dto.email, dto.password);
      const duration = Date.now() - start;
      this.logger.log(
        `Login completed [email=${masked}, duration=${duration}ms]`,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.warn(
        `Login failed [email=${masked}, duration=${duration}ms, error=${(error as Error).message}]`,
      );
      throw error;
    }
  }
}
