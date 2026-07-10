import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import type { IngestorRunOptions } from './ingestor.interface';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  /** Health of every ingestor + DB counts — feeds the monitoring page. */
  @Get('status')
  getStatus() {
    return this.ingestion.getStatus();
  }

  @Get('runs')
  listRuns(@Query('ingestor') ingestor?: string, @Query('take') take?: string) {
    return this.ingestion.listRuns(ingestor, take ? Number(take) : undefined);
  }

  /** One run with its full log trail. */
  @Get('runs/:id')
  getRun(@Param('id') id: string) {
    return this.ingestion.getRun(id);
  }

  /** Manual trigger (the page's "lancer un scraping" button). */
  @Post(':name/run')
  @HttpCode(202)
  async trigger(
    @Param('name') name: string,
    @Body() options?: IngestorRunOptions,
  ) {
    return this.ingestion.triggerRun(name, 'MANUAL', options);
  }
}
