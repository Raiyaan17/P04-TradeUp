import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// ─── Mock helpers ────────────────────────────────────────────────────────────

const mockUsersService = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    create: jest.fn(),
    ensureDefaultProfileImage: jest.fn(),
};

const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    // ── signup ──────────────────────────────────────────────────────────────────

    describe('signup', () => {
        it('should create a user and return an access token', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.findByUsername.mockResolvedValue(null);
            mockUsersService.create.mockResolvedValue({
                id: 1,
                email: 'test@example.com',
                role: 'TRADER',
            });

            const result = await service.signup(
                'test@example.com',
                'testuser',
                'Password123!',
                'TRADER',
                'MALE',
            );

            expect(result).toEqual({ access_token: 'mock.jwt.token' });
            expect(mockUsersService.create).toHaveBeenCalledTimes(1);
        });

        it('should throw ConflictException if email is already registered', async () => {
            mockUsersService.findByEmail.mockResolvedValue({ id: 1 });

            await expect(
                service.signup('taken@example.com', 'newuser', 'pass', 'TRADER', 'FEMALE'),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw ConflictException if username is already taken', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);
            mockUsersService.findByUsername.mockResolvedValue({ id: 2 });

            await expect(
                service.signup('new@example.com', 'takenuser', 'pass', 'TRADER', 'MALE'),
            ).rejects.toThrow(ConflictException);
        });
    });

    // ── login ───────────────────────────────────────────────────────────────────

    describe('login', () => {
        it('should return access token on valid credentials', async () => {
            const hash = await bcrypt.hash('correctpass', 10);
            mockUsersService.findByEmail.mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                passwordHash: hash,
                role: 'TRADER',
            });
            mockUsersService.ensureDefaultProfileImage.mockResolvedValue(undefined);

            const result = await service.login('user@example.com', 'correctpass');

            expect(result).toEqual({ access_token: 'mock.jwt.token' });
        });

        it('should throw UnauthorizedException if user does not exist', async () => {
            mockUsersService.findByEmail.mockResolvedValue(null);

            await expect(service.login('nobody@example.com', 'pass')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should throw UnauthorizedException if password is incorrect', async () => {
            const hash = await bcrypt.hash('correctpass', 10);
            mockUsersService.findByEmail.mockResolvedValue({
                id: 1,
                email: 'user@example.com',
                passwordHash: hash,
                role: 'TRADER',
            });

            await expect(
                service.login('user@example.com', 'wrongpass'),
            ).rejects.toThrow(UnauthorizedException);
        });
    });
});
