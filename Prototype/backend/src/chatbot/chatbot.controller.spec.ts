import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

describe('ChatbotController', () => {
  let controller: ChatbotController;
  let chatbotService: Record<string, jest.Mock>;

  beforeEach(async () => {
    chatbotService = {
      getOrCreateSession: jest.fn(),
      getSessionHistory: jest.fn(),
      getChatResponse: jest.fn(),
      generatePeriodicReview: jest.fn(),
      trainBaselineModel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatbotController],
      providers: [{ provide: ChatbotService, useValue: chatbotService }],
    }).compile();

    controller = module.get<ChatbotController>(ChatbotController);
  });

  // @ts-ignore
  import { AuthenticatedRequest } from '../types/request.type'; // Adjust if needed, or define locally. Wait, let's just use `as unknown as AuthenticatedRequest`. Actually, I will declare an interface.

  interface AuthenticatedRequest {
    user: {
      userId: number;
      email: string;
      role: string;
    };
  }

  // Helper to build a fake authenticated request
  const makeReq = (
    overrides: Partial<{ userId: number; email: string; role: string }> = {},
  ): AuthenticatedRequest => ({
    user: {
      userId: overrides.userId ?? 1,
      email: overrides.email ?? 'test@example.com',
      role: overrides.role ?? 'TRADER',
    },
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chatbot/session
  // ═══════════════════════════════════════════════════════════════

  describe('POST /chatbot/session', () => {
    it('should create/return a session with sessionId and createdAt', async () => {
      const fakeSession = { id: 42, createdAt: new Date('2026-03-31') };
      chatbotService.getOrCreateSession.mockResolvedValue(fakeSession);

      const result = await controller.getOrCreateSession(
        // @ts-ignore
        makeReq() as unknown as import('../auth/auth.guard').AuthenticatedRequest,
      );

      expect(chatbotService.getOrCreateSession).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        sessionId: 42,
        createdAt: fakeSession.createdAt,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /chatbot/history/:sessionId
  // ═══════════════════════════════════════════════════════════════

  describe('GET /chatbot/history/:sessionId', () => {
    it('should return messages for the given session', async () => {
      const messages = [
        { id: 1, role: 'user', content: 'hi' },
        { id: 2, role: 'assistant', content: 'hello!' },
      ];
      chatbotService.getSessionHistory.mockResolvedValue(messages);

      const result = await controller.getHistory(
        // @ts-ignore
        makeReq() as unknown as import('../auth/auth.guard').AuthenticatedRequest,
        10,
      );

      expect(chatbotService.getSessionHistory).toHaveBeenCalledWith(10, 1);
      expect(result).toEqual({ messages });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chatbot/chat
  // ═══════════════════════════════════════════════════════════════

  describe('POST /chatbot/chat', () => {
    it('should pass userId, sessionId, and message to the service', async () => {
      chatbotService.getChatResponse.mockResolvedValue('AI says hello');

      const result = await controller.chat(
        // @ts-ignore
        makeReq() as unknown as import('../auth/auth.guard').AuthenticatedRequest,
        {
          sessionId: 5,
          message: 'analyze OGDC',
        },
      );

      expect(chatbotService.getChatResponse).toHaveBeenCalledWith(
        1,
        5,
        'analyze OGDC',
      );
      expect(result).toEqual({ response: 'AI says hello' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chatbot/review
  // ═══════════════════════════════════════════════════════════════

  describe('POST /chatbot/review', () => {
    it('should generate a periodic review with the given period', async () => {
      chatbotService.generatePeriodicReview.mockResolvedValue(
        'Your weekly review...',
      );

      const result = await controller.review(
        // @ts-ignore
        makeReq() as unknown as import('../auth/auth.guard').AuthenticatedRequest,
        {
          period: 'weekly',
        },
      );

      expect(chatbotService.generatePeriodicReview).toHaveBeenCalledWith(
        1,
        'weekly',
      );
      expect(result).toEqual({ report: 'Your weekly review...' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chatbot/train
  // ═══════════════════════════════════════════════════════════════

  describe('POST /chatbot/train', () => {
    it('should allow ADMIN users to trigger model retraining', async () => {
      chatbotService.trainBaselineModel.mockResolvedValue(undefined);

      const result = await controller.train(
        makeReq({
          role: 'ADMIN',
          // @ts-ignore
        }) as unknown as import('../auth/auth.guard').AuthenticatedRequest,
      );

      expect(chatbotService.trainBaselineModel).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Market baseline refreshed successfully.',
      });
    });

    it('should block non-admin (TRADER) users with ForbiddenException', async () => {
      await expect(
        controller.train(
          makeReq({
            role: 'TRADER',
            // @ts-ignore
          }) as unknown as import('../auth/auth.guard').AuthenticatedRequest,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(chatbotService.trainBaselineModel).not.toHaveBeenCalled();
    });
  });
});
