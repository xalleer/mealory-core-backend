import {
  BadRequestException,
  Controller,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { mkdirSync } from 'fs';
import type { Multer } from 'multer';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { IsIn, IsOptional } from 'class-validator';
import { AdminGuard } from '../../admin/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

const UPLOAD_TYPE_VALUES = ['products', 'avatars'] as const;

type UploadType = (typeof UPLOAD_TYPE_VALUES)[number];

class UploadTempQueryDto {
  @ApiPropertyOptional({ enum: UPLOAD_TYPE_VALUES })
  @IsOptional()
  @IsIn(UPLOAD_TYPE_VALUES)
  type?: UploadType;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('temp')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const typeRaw = req.query?.type;
          const type =
            typeof typeRaw === 'string' &&
            (UPLOAD_TYPE_VALUES as readonly string[]).includes(typeRaw)
              ? typeRaw
              : 'products';

          const dir = join(process.cwd(), 'uploads', type, 'temp');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const safeExt = extname(file.originalname || '').toLowerCase();
          const ext = safeExt && safeExt.length <= 10 ? safeExt : '';
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadTemp(
    @UploadedFile() file: Multer.File | undefined,
    @Query() query: UploadTempQueryDto,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const appPublicUrl = process.env.APP_PUBLIC_URL?.replace(/\/$/, '');
    const baseUrl = appPublicUrl ?? `${req.protocol}://${req.get('host')}`;
    const type = query.type ?? 'products';

    return {
      url: `${baseUrl}/uploads/${type}/temp/${file.filename}`,
    };
  }
}
