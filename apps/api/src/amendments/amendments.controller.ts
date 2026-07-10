import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TextNature } from '../../generated/prisma/enums.js';
import { AmendmentsService } from './amendments.service';

interface SimilarByTextBody {
  /** Texte libre : dispositif d'un brouillon d'amendement, upload, etc. */
  text?: string;
  take?: number;
  legislature?: number;
  texteRef?: string;
  nature?: string;
}

const DEFAULT_TAKE = 10;
const MAX_TAKE = 50;

@Controller('amendments')
export class AmendmentsController {
  constructor(private readonly amendments: AmendmentsService) {}

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.amendments.getById(id);
  }

  @Get(':id/similar')
  async findSimilar(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('legislature') legislature?: string,
    @Query('texteRef') texteRef?: string,
    @Query('nature') nature?: string,
    @Query('excludeSameTexte') excludeSameTexte?: string,
  ) {
    const items = await this.amendments.findSimilarById(id, {
      take: parseTake(take),
      legislature: parseOptionalInt(legislature, 'legislature'),
      texteRef: texteRef || undefined,
      nature: parseNature(nature),
      excludeSameTexte: excludeSameTexte === 'true',
    });
    return { items };
  }

  @Post('similar')
  @HttpCode(200)
  async findSimilarByText(@Body() body: SimilarByTextBody) {
    const text = body?.text?.trim();
    if (!text) {
      throw new BadRequestException('Body field "text" is required');
    }
    const items = await this.amendments.findSimilarByText(text, {
      take: parseTake(body.take !== undefined ? String(body.take) : undefined),
      legislature:
        body.legislature !== undefined
          ? parseOptionalInt(String(body.legislature), 'legislature')
          : undefined,
      texteRef: body.texteRef || undefined,
      nature: parseNature(body.nature),
    });
    return { items };
  }
}

function parseNature(raw?: string): TextNature | undefined {
  if (!raw) return undefined;
  if (raw in TextNature) return raw as TextNature;
  throw new BadRequestException(
    `"nature" must be one of: ${Object.values(TextNature).join(', ')}`,
  );
}

function parseTake(raw?: string): number {
  if (raw === undefined || raw === '') return DEFAULT_TAKE;
  const take = Number(raw);
  if (!Number.isInteger(take) || take < 1) {
    throw new BadRequestException('"take" must be a positive integer');
  }
  return Math.min(take, MAX_TAKE);
}

function parseOptionalInt(
  raw: string | undefined,
  name: string,
): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new BadRequestException(`"${name}" must be an integer`);
  }
  return value;
}
