import { Body, Controller, Put, Request, UseGuards, Get, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import * as bcrypt from 'bcrypt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Logger } from '@nestjs/common';


interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
    role: 'TRADER' | 'ADMIN';
  };
}

type UploadedFileType = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  @UseGuards(JwtAuthGuard)
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(@Request() req: AuthenticatedRequest, @UploadedFile() file: UploadedFileType) {
    if (!file) {
      this.logger.error('No file uploaded');
      throw new UnauthorizedException('No file uploaded');
    }
    try {
      // Pass file.mimetype to service for correct contentType
      const imageUrl = await this.usersService.uploadProfilePicture(req.user.userId, file.buffer, file.originalname, file.mimetype);
      this.logger.debug(`Image uploaded successfully. URL: ${imageUrl}`);
      return { imageUrl };
    } catch (error) {
      this.logger.error('Error uploading profile image', error.stack);
      return { error: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile-picture')
  async getProfilePicture(@Request() req: AuthenticatedRequest) {
    // Use userId from auth middleware
    const imageUrl = await this.usersService.getProfilePictureUrl(req.user.userId);
    return { imageUrl };
  }
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    // Mask userId in logs
    console.log('JWT User object:', {
      ...req.user,
      userId: req.user.userId
        ? '***' + String(req.user.userId).slice(-2)
        : undefined,
    });

    const userId = req.user.userId;
    if (!userId) {
      throw new UnauthorizedException('No user ID found in token');
    }

    const user = await this.usersService.findById(userId);
    console.log('Found user:', user ? 'Yes' : 'No');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash, ...userProfile } = user;
    void passwordHash;
    return userProfile;
  }

  @Get('test')
  test() {
    return { message: 'Users controller is working!' };
  }

  @UseGuards(JwtAuthGuard)
  @Put('email')
  async changeEmail(
    @Request() req: AuthenticatedRequest,
    @Body() body: { newEmail: string; currentPassword: string },
  ) {
    const userId = req.user.userId;
    const { newEmail, currentPassword } = body;

    // Mask newEmail in logs
    console.log(
      'Email update requested for userId:',
      userId ? '***' + String(userId).slice(-2) : undefined,
      'newEmail:',
      newEmail
        ? newEmail[0] + '***' + newEmail.slice(newEmail.indexOf('@'))
        : undefined,
    );

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const emailExists = await this.usersService.emailExists(newEmail, userId);
    if (emailExists) {
      throw new ConflictException('Email already in use');
    }

    await this.usersService.updateEmail(userId, newEmail);
    return {
      success: true,
      message: 'Email updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = body;

    // Mask userId in logs
    console.log(
      'Password update requested for userId:',
      userId ? '***' + String(userId).slice(-2) : undefined,
    );

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.usersService.updatePassword(userId, newPasswordHash);
    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put('name')
  async changeName(
    @Request() req: AuthenticatedRequest,
    @Body() body: { newName: string; currentPassword: string },
  ) {
    const userId = req.user.userId;
    const { newName, currentPassword } = body;

    // Mask userId and newName in logs
    console.log(
      'Name update requested for userId:',
      userId ? '***' + String(userId).slice(-2) : undefined,
      'newName:',
      newName ? newName[0] + '***' : undefined,
    );

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.usersService.updateName(userId, newName);
    return {
      success: true,
      message: 'Name updated successfully',
    };
  }

  //! Add Funds
  @UseGuards(JwtAuthGuard)
  @Post('fund-wallet')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TRADER')
  async fundWallet(
    @Request() req: AuthenticatedRequest,
    @Body() fundWalletDto: FundWalletDto,
  ) {
    const userId = req.user.userId;
    const { amount } = fundWalletDto;

    // Mask userId in logs
    console.log(
      'Wallet funding requested for userId:',
      userId ? '***' + String(userId).slice(-2) : undefined,
    );

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.updateBalance({ userId, amount });
  }
  
}
