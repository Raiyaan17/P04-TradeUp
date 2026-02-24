import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// ─── Auto-mock axios ──────────────────────────────────────────────────────────

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Mock PrismaService ───────────────────────────────────────────────────────

const mockPrisma = {
    stock: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StocksService', () => {
    let service: StocksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StocksService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<StocksService>(StocksService);
        jest.clearAllMocks();
    });

    // ── getFeaturedSymbols ──────────────────────────────────────────────────────

    describe('getFeaturedSymbols', () => {
        it('should return the list of featured PSX symbols', () => {
            const symbols = service.getFeaturedSymbols();
            expect(symbols).toContain('HBL');
            expect(symbols).toContain('MCB');
            expect(symbols.length).toBeGreaterThan(0);
        });
    });

    // ── getTick ─────────────────────────────────────────────────────────────────

    describe('getTick', () => {
        it('should return tick data when the API responds successfully', async () => {
            const fakeTick = { symbol: 'HBL', price: 150.5, volume: 12000 };
            mockedAxios.get.mockResolvedValueOnce({
                data: { success: true, data: fakeTick },
            });

            const result = await service.getTick('HBL');

            expect(result).toEqual(fakeTick);
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        });

        it('should return null when the API returns success: false', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                data: { success: false, data: null },
            });

            const result = await service.getTick('UNKNOWN');
            expect(result).toBeNull();
        });

        it('should return null when the API call throws an error', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

            const result = await service.getTick('HBL');
            expect(result).toBeNull();
        });
    });

    // ── findOrCreateStock ───────────────────────────────────────────────────────

    describe('findOrCreateStock', () => {
        it('should return an existing stock without creating a new one', async () => {
            const existingStock = { id: 1, symbol: 'HBL' };
            mockPrisma.stock.findUnique.mockResolvedValue(existingStock);

            const result = await service.findOrCreateStock('HBL');

            expect(result).toEqual(existingStock);
            expect(mockPrisma.stock.create).not.toHaveBeenCalled();
        });

        it('should create and return a new stock if it does not exist', async () => {
            const newStock = { id: 2, symbol: 'FFC' };
            mockPrisma.stock.findUnique.mockResolvedValue(null);
            mockPrisma.stock.create.mockResolvedValue(newStock);

            const result = await service.findOrCreateStock('FFC');

            expect(result).toEqual(newStock);
            expect(mockPrisma.stock.create).toHaveBeenCalledWith({
                data: { symbol: 'FFC' },
            });
        });
    });

    // ── getKlines ───────────────────────────────────────────────────────────────

    describe('getKlines', () => {
        it('should return kline data on a successful response', async () => {
            const fakeKlines = [
                { timestamp: 1700000000, open: 100, high: 110, low: 98, close: 105, volume: 5000 },
            ];
            mockedAxios.get.mockResolvedValueOnce({
                data: { success: true, data: fakeKlines },
            });

            const result = await service.getKlines('HBL', '1d');
            expect(result).toEqual(fakeKlines);
        });

        it('should return an empty array when the API call fails', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('Timeout'));

            const result = await service.getKlines('HBL', '1m');
            expect(result).toEqual([]);
        });
    });
});
