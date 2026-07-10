import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { RecevabiliteService } from './recevabilite.service';

@Controller('amendments')
export class RecevabiliteController {
  constructor(private readonly recevabilite: RecevabiliteService) {}

  /** Lance l'analyse de recevabilité (G0→G6) et persiste le verdict tracé. */
  @Post(':id/review')
  @HttpCode(200)
  review(@Param('id') id: string) {
    return this.recevabilite.review(id);
  }

  /** Dernière analyse persistée — le "lien vers le détail" du bloc (iv). */
  @Get(':id/review/latest')
  latest(@Param('id') id: string) {
    return this.recevabilite.latest(id);
  }
}
