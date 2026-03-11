import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ChatRequestDto, ReviewRequestDto } from './dto/chat.dto';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
    role: 'TRADER' | 'ADMIN';
  };
}

@Controller('chatbot')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * POST /chatbot/session
   * Get the active session for the user, or create a new one.
   * Call this when the user opens the chat UI.
   */
  @Post('session')
  async getOrCreateSession(@Req() req: AuthenticatedRequest) {
    const session = await this.chatbotService.getOrCreateSession(req.user.userId);
    return { sessionId: session.id, createdAt: session.createdAt };
  }

  /**
   * GET /chatbot/history/:sessionId
   * Load all messages for a session (to restore chat UI on page reload).
   */
  @Get('history/:sessionId')
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const messages = await this.chatbotService.getSessionHistory(sessionId, req.user.userId);
    return { messages };
  }

  /**
   * POST /chatbot/chat
   * Send a message and get an AI response.
   * Body: { sessionId: number, message: string }
   */
  @Post('chat')
  async chat(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChatRequestDto,
  ) {
    this.logger.log(
      `Chat from user ${req.user.userId} in session ${body.sessionId}: "${body.message}"`,
    );
    const response = await this.chatbotService.getChatResponse(
      req.user.userId,
      body.sessionId,
      body.message,
    );
    return { response };
  }

  /**
   * POST /chatbot/review
   * Generate a weekly or monthly performance review for the user.
   * Body: { period: 'weekly' | 'monthly' }
   */
  @Post('review')
  async review(
    @Req() req: AuthenticatedRequest,
    @Body() body: ReviewRequestDto,
  ) {
    this.logger.log(
      `${body.period} review requested by user ${req.user.userId}`,
    );
    const report = await this.chatbotService.generatePeriodicReview(
      req.user.userId,
      body.period,
    );
    return { report };
  }

  /**
   * POST /chatbot/train
   * ADMIN ONLY — manually refresh the market baseline from simulation data.
   */
  @Post('train')
  async train(@Req() req: AuthenticatedRequest) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can trigger model retraining.');
    }
    await this.chatbotService.trainBaselineModel();
    return { message: 'Market baseline refreshed successfully.' };
  }
}