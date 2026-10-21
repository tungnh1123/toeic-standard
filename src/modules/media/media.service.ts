import { Injectable, Logger } from '@nestjs/common';
import { GeneratePresignedUrlDto } from './dto/presigned-url.dto';
import * as crypto from 'crypto';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /**
   * Endpoint #53: Cấp Presigned PUT URL an toàn để upload audio Speaking / Media Direct-to-S3
   * (Inviolable Red Line #5: Direct-to-S3 Protocol)
   */
  public generatePresignedUrl(
    userId: string,
    dto: GeneratePresignedUrlDto,
  ): PresignedUrlResponse {
    const rawExt = dto.filename.split('.').pop() || 'mp3';
    const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileKey = `speaking-samples/${userId}/${timestamp}-${uniqueId}.${cleanExt}`;

    const s3Bucket = process.env.AWS_S3_BUCKET || 'toeic-speaking-media';
    const s3Region = process.env.AWS_REGION || 'ap-southeast-1';
    const expiresInSeconds = 900; // 15 phút

    // Construct Direct-to-S3 Presigned PUT URL
    const uploadUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${fileKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSeconds}`;

    this.logger.log(`Generated Direct-to-S3 Presigned URL for user ${userId}, fileKey: ${fileKey}`);

    return {
      uploadUrl,
      fileKey,
      expiresInSeconds,
    };
  }
}

