import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MediaService, PresignedUrlResponse } from './media.service';
import { GeneratePresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUserPayload } from '../../common/decorators/roles.decorator';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Endpoint #53: Cấp Presigned PUT URL an toàn upload audio Speaking
   * POST /api/v1/submissions/presigned-url
   */
  @Post('presigned-url')
  @HttpCode(HttpStatus.OK)
  public getPresignedUrl(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: GeneratePresignedUrlDto,
  ): PresignedUrlResponse {
    return this.mediaService.generatePresignedUrl(user.sub, dto);
  }
}
