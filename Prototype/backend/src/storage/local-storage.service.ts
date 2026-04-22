import { Injectable } from '@nestjs/common';

@Injectable()
export class LocalStorageService {
  async uploadImage(
    userId: number,
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
  ): Promise<string> {
    // Fallback stub for prototype
    console.log(
      `[LocalStorageFallback] Dummy storing image ${originalFileName}`,
    );
    return `https://placehold.co/600x400?text=Fallback+Image`;
  }
}
