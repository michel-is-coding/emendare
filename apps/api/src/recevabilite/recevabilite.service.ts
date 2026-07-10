import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service';
import { GatesService } from './gates.service';
import { LlmReviewerService } from './llm-reviewer.service';
import { MOTIFS, ReviewVerdict, TraceEntry } from './types';

export const REVIEWER_TYPE = 'agent-recevabilite-v1';

/**
 * Orchestrateur de l'agent recevabilité (pipeline G0→G6,
 * cf. docs/metier/procedure-recevabilite-agent.md) :
 * gates déterministes → aiguillage → LLM si nécessaire → verdict persisté et traçable.
 */
@Injectable()
export class RecevabiliteService {
  private readonly logger = new Logger(RecevabiliteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gates: GatesService,
    private readonly llm: LlmReviewerService,
  ) {}

  async review(
    amendmentId: string,
  ): Promise<ReviewVerdict & { analysisId: string }> {
    const amendment = await this.prisma.amendment.findUnique({
      where: { id: amendmentId },
      include: { lawText: true },
    });
    if (!amendment) {
      throw new NotFoundException(`Amendment "${amendmentId}" not found`);
    }

    const result = await this.gates.run(amendment);
    const trace = result.trace;
    let verdict: ReviewVerdict;

    if (result.conclusion) {
      // Conclusion déterministe (prouvée) — prime sur tout.
      const motif = MOTIFS[result.conclusion.motifCode];
      verdict = {
        sort: 'IRRECEVABLE',
        motifCode: motif.code,
        motifLibelle: motif.libelle,
        fondement: motif.fondement,
        confiance: 0.95,
        justificatif: result.conclusion.constat,
        fastTrack: true,
        model: null,
        trace,
      };
    } else if (result.fastTrackRecevable) {
      verdict = {
        sort: 'RECEVABLE',
        motifCode: null,
        motifLibelle: null,
        fondement: null,
        confiance: 0.9,
        justificatif:
          'Aucun signal de risque détecté (contrôles formels, lexique art. 40, gage, injonction, précédents).',
        fastTrack: true,
        model: null,
        trace,
      };
    } else if (!this.llm.isConfigured) {
      // Gates non concluantes et pas de LLM : verdict prudent, basse confiance.
      verdict = {
        sort: 'RECEVABLE',
        motifCode: null,
        motifLibelle: null,
        fondement: null,
        confiance: 0.3,
        justificatif:
          'Signaux de risque détectés mais examen LLM indisponible (clé API absente) : revue humaine recommandée.',
        fastTrack: false,
        model: null,
        trace: [
          ...trace,
          {
            gate: 'G5',
            regle: 'LLM_INDISPONIBLE',
            constat: 'REVIEWER_API_KEY absente : examen approfondi impossible.',
            effet: 'PASSE',
          },
        ],
      };
    } else {
      const llmResult = await this.llm.review(
        amendment,
        result.context,
        result.signals,
        result.checklist,
      );
      const motif = llmResult.motifCode ? MOTIFS[llmResult.motifCode] : null;
      const llmTrace: TraceEntry[] = llmResult.regles.map((r) => ({
        gate: 'G5' as const,
        regle: r.code,
        fondement: MOTIFS[r.code]?.fondement,
        constat: `${r.avis} — ${r.raisonnement}`,
        evidence: r.evidence,
        effet:
          r.avis === 'IRRECEVABLE' ? ('CONCLUT' as const) : ('INFO' as const),
      }));
      verdict = {
        sort: llmResult.sort,
        motifCode: motif?.code ?? null,
        motifLibelle: motif?.libelle ?? null,
        fondement: motif?.fondement ?? null,
        confiance: llmResult.confiance,
        justificatif: llmResult.justificatif,
        fastTrack: false,
        model: this.llm.model,
        regles: llmResult.regles,
        trace: [...trace, ...llmTrace],
      };
    }

    verdict.trace.push({
      gate: 'G6',
      regle: 'VERDICT',
      constat: `${verdict.sort}${verdict.motifLibelle ? ` — ${verdict.motifLibelle}` : ''} (confiance ${Math.round(verdict.confiance * 100)} %${verdict.fastTrack ? ', fast-track' : ''})`,
      effet: 'CONCLUT',
    });

    const analysis = await this.prisma.amendmentAnalysis.create({
      data: {
        amendmentId,
        reviewerType: REVIEWER_TYPE,
        confidence: verdict.confiance,
        rationale: verdict.justificatif,
        tags: [
          ...(verdict.motifCode ? [verdict.motifCode] : []),
          ...(verdict.fastTrack ? ['fast-track'] : []),
        ],
        sort: verdict.sort,
        motifCode: verdict.motifCode,
        motifLibelle: verdict.motifLibelle,
        fondement: verdict.fondement,
        fastTrack: verdict.fastTrack,
        model: verdict.model,
        trace: verdict.trace as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Review ${amendment.numero ?? amendmentId}: ${verdict.sort}${verdict.motifCode ? ` (${verdict.motifCode})` : ''} conf=${verdict.confiance}${verdict.fastTrack ? ' [fast-track]' : ` [${verdict.model}]`}`,
    );

    return { ...verdict, analysisId: analysis.id };
  }

  /** Dernière analyse persistée (lien "détail" du bloc (iv)). */
  async latest(amendmentId: string) {
    const analysis = await this.prisma.amendmentAnalysis.findFirst({
      where: { amendmentId, reviewerType: REVIEWER_TYPE },
      orderBy: { createdAt: 'desc' },
    });
    if (!analysis) {
      throw new NotFoundException(
        `No recevabilité analysis for amendment "${amendmentId}"`,
      );
    }
    return analysis;
  }
}
