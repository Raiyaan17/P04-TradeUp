import { Injectable } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService {
  async uploadImage(
    userId: number,
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<string> {
    if (!existsSync(UPLOADS_DIR)) {
      await mkdir(UPLOADS_DIR, { recursive: true });
    }

    const ext = extname(originalFileName) || '.jpg';
    const filename = `${Date.now()}-${userId}-${randomBytes(6).toString('hex')}${ext}`;
    await writeFile(join(UPLOADS_DIR, filename), fileBuffer);

    const baseUrl =
      process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    return `${baseUrl}/uploads/${filename}`;
  }
}
