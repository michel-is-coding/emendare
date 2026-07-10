import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import {
  AmendmentStatus,
  LegislativeTextKind,
  TextNature,
} from '../../generated/prisma/enums.js';
import type { AmendmentOrderBy, VerdictFilter } from './texts.service';
import { TextsService } from './texts.service';

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

@Controller('texts')
export class TextsController {
  constructor(private readonly texts: TextsService) {}

  @Get()
  list(
    @Query('kind') kind?: string,
    @Query('nature') nature?: string,
    @Query('legislature') legislature?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.texts.list({
      kind: parseKind(kind),
      nature: parseNature(nature),
      legislature: parseOptionalInt(legislature, 'legislature'),
      take: parseTake(take),
      skip: parseSkip(skip),
    });
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.texts.getById(id);
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.texts.stats(id);
  }

  @Get(':id/amendments')
  listAmendments(
    @Param('id') id: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    // `sort=aucun` = sans sort (à instruire) ; sinon égalité stricte sur le sort AN.
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('article') article?: string,
    @Query('q') q?: string,
    @Query('orderBy') orderBy?: string,
    @Query('verdict') verdict?: string,
  ) {
    return this.texts.listAmendments(id, parseTake(take), parseSkip(skip), {
      sort: sort || undefined,
      status: parseStatus(status),
      article: article || undefined,
      q: q || undefined,
      orderBy: parseEnum(orderBy, 'orderBy', ORDER_BY_VALUES),
      verdict: parseEnum(verdict, 'verdict', VERDICT_VALUES),
    });
  }
}

const ORDER_BY_VALUES: AmendmentOrderBy[] = ['numero', 'dateDepot'];
const VERDICT_VALUES: VerdictFilter[] = ['RECEVABLE', 'IRRECEVABLE'];

function parseStatus(raw?: string): AmendmentStatus | undefined {
  if (!raw) return undefined;
  if (raw in AmendmentStatus) return raw as AmendmentStatus;
  throw new BadRequestException(
    `"status" must be one of: ${Object.values(AmendmentStatus).join(', ')}`,
  );
}

function parseEnum<T extends string>(
  raw: string | undefined,
  name: string,
  values: T[],
): T | undefined {
  if (!raw) return undefined;
  if ((values as string[]).includes(raw)) return raw as T;
  throw new BadRequestException(
    `"${name}" must be one of: ${values.join(', ')}`,
  );
}

function parseKind(raw?: string): LegislativeTextKind | undefined {
  if (!raw) return undefined;
  if (raw in LegislativeTextKind) return raw as LegislativeTextKind;
  throw new BadRequestException(
    `"kind" must be one of: ${Object.values(LegislativeTextKind).join(', ')}`,
  );
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

function parseSkip(raw?: string): number {
  if (raw === undefined || raw === '') return 0;
  const skip = Number(raw);
  if (!Number.isInteger(skip) || skip < 0) {
    throw new BadRequestException('"skip" must be a non-negative integer');
  }
  return skip;
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
