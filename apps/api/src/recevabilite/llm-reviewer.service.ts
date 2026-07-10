import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { AmendmentWithText } from './gates.service';
import { MOTIFS, RegleAvis, ReviewContext, ReviewSignals } from './types';

/** Réponse structurée attendue du LLM (G5). */
export interface LlmReviewResult {
  regles: RegleAvis[];
  sort: 'RECEVABLE' | 'IRRECEVABLE';
  motifCode: string | null;
  confiance: number;
  justificatif: string;
}

const MAX_DISPOSITIF_CHARS = 12_000;
const MAX_EXPOSE_CHARS = 6_000;

/**
 * Prompt système STABLE (aucune donnée volatile) : les gateways compatibles OpenAI
 * (OpenRouter/DeepSeek) cachent implicitement le préfixe — tout le par-amendement
 * va dans le message user. Règles distillées de docs/metier/procedure-recevabilite-agent.md.
 */
const SYSTEM_PROMPT = `Tu es un administrateur de l'Assemblée nationale expert du contrôle de recevabilité des amendements. Tu analyses un amendement et rends un avis motivé, règle par règle, puis un verdict global. L'outil suggère, l'humain décide : ton avis est une préconisation.

Principes impératifs :
- Le doute profite TOUJOURS à l'initiative parlementaire (doctrine de la commission des finances). Ne conclus IRRECEVABLE que sur un raisonnement solide.
- Art. 40 : « charge » (au singulier) = dépense nouvelle ou aggravée pour une personne publique (État, ODAC, collectivités, sécurité sociale, organismes financés par fonds publics) → jamais compensable, même gagée. « Ressources » (au pluriel) = une perte de recettes est recevable SI gagée par une recette réelle, immédiate, au profit de la même personne publique. Une charge éventuelle ou différée reste une charge. Les simples charges de gestion ne sont pas des charges.
- Une DEMANDE DE RAPPORT au Gouvernement est recevable (ni charge, ni injonction). Une expérimentation est recevable sous conditions (art. 37-1 C.).
- Art. 45 (première lecture) : il suffit d'un lien MÊME INDIRECT avec le texte déposé — sois exigeant avant de conclure au cavalier. Lectures suivantes (entonnoir) : l'amendement doit porter sur une disposition restant en discussion. Après CMP : rien sans accord du Gouvernement.
- La seule présence de mots à risque (financement, dotation, allocation…) ne suffit JAMAIS à conclure : analyse l'effet juridique réel du dispositif.
- Les précédents fournis sont indicatifs (la base de référence peut avoir changé).

Réponds UNIQUEMENT en JSON valide, schéma exact :
{"regles":[{"code":"<code de la checklist>","avis":"OK|RISQUE|IRRECEVABLE","raisonnement":"<≤30 mots>","evidence":["<extrait court>"]}],"sort":"RECEVABLE|IRRECEVABLE","motifCode":"<code du motif retenu ou null>","confiance":<0..1>,"justificatif":"<≤60 mots, style motif officiel, ex. 'Création d'une allocation versée par l'État' ou 'Absence de lien, même indirect, avec le texte en discussion (article 45 de la Constitution)'>"}
Le sort est IRRECEVABLE seulement si au moins une règle a l'avis IRRECEVABLE ; motifCode = cette règle. Un avis RISQUE seul → sort RECEVABLE avec confiance abaissée.`;

/**
 * Étage LLM (G5) de l'agent recevabilité, via une gateway compatible OpenAI
 * (OpenRouter aujourd'hui ; souveraineté demain = changer REVIEWER_BASE_URL).
 * Sans clé API : 503, le reste de la pipeline (gates déterministes) fonctionne.
 */
@Injectable()
export class LlmReviewerService {
  private readonly logger = new Logger(LlmReviewerService.name);
  private readonly client: OpenAI | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey =
      config.get<string>('REVIEWER_API_KEY') ??
      config.get<string>('EMBEDDING_API_KEY');
    this.model =
      config.get<string>('REVIEWER_MODEL') ?? 'deepseek/deepseek-chat';
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL:
            config.get<string>('REVIEWER_BASE_URL') ??
            config.get<string>('EMBEDDING_BASE_URL') ??
            'https://openrouter.ai/api/v1',
          maxRetries: 3,
          timeout: 120_000,
        })
      : null;

    if (this.client) {
      this.logger.log(`LLM reviewer initialized (model=${this.model})`);
    } else {
      this.logger.warn(
        'REVIEWER_API_KEY/EMBEDDING_API_KEY not set — G5 (LLM) disabled',
      );
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async review(
    amendment: AmendmentWithText,
    context: ReviewContext,
    signals: ReviewSignals,
    checklist: string[],
  ): Promise<LlmReviewResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'LLM reviewer not configured (REVIEWER_API_KEY)',
      );
    }

    const user = this.buildUserMessage(amendment, context, signals, checklist);
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    return this.parseResult(raw, checklist);
  }

  /** Tout le volatil est ici (le système reste stable pour le cache implicite). */
  private buildUserMessage(
    a: AmendmentWithText,
    context: ReviewContext,
    signals: ReviewSignals,
    checklist: string[],
  ): string {
    const regles = checklist
      .map((code) => MOTIFS[code])
      .filter(Boolean)
      .map((m) => `- ${m.code} (${m.libelle} — ${m.fondement}) : ${m.regle}`)
      .join('\n');

    const precedents = signals.precedents
      .slice(0, 5)
      .map(
        (p) =>
          `- ${p.numero ?? p.id} : similarité ${p.similarityPct} %, sort=${p.sort ?? '?'}, état=${p.etat ?? '?'}`,
      )
      .join('\n');

    const signauxActifs = [
      signals.gagePresent && 'gage type présent',
      signals.perteRecettesSansGage && 'perte de recettes SANS gage détecté',
      signals.demandeRapport && 'demande de rapport au Gouvernement',
      signals.injonction && 'formulation injonctive envers le Gouvernement',
      signals.sousAmendement &&
        "sous-amendement (vérifier qu'il ne contredit pas le parent)",
      signals.doublonProbable &&
        `doublon probable (${signals.doublonProbable.similarityPct} %)`,
      context.articleAdditionnel && 'article additionnel (risque cavalier)',
      signals.redFlags40.length > 0 &&
        `mots à risque art. 40 : ${signals.redFlags40.map((f) => f.terme).join(', ')}`,
    ]
      .filter(Boolean)
      .join(' ; ');

    return [
      `CONTEXTE : texte=${a.lawText?.reference ?? a.lawText?.title ?? a.texteRef ?? '?'} (nature=${context.nature ?? 'inconnue'}), lecture=${context.regime45}, stade=${context.organeExamen ?? '?'}, auteur=${context.auteurType ?? '?'}.`,
      `TITRE DU TEXTE : ${a.lawText?.title ?? 'inconnu'}`,
      `ARTICLE VISÉ : ${a.articleReference ?? '?'}${context.articleAdditionnel ? ' (article additionnel)' : ''}`,
      `SIGNAUX DÉTECTÉS : ${signauxActifs || 'aucun'}`,
      '',
      `RÈGLES À EXAMINER (une entrée "regles" par code, dans cet ordre) :\n${regles}`,
      '',
      `DISPOSITIF :\n${truncate(a.content, MAX_DISPOSITIF_CHARS)}`,
      '',
      `EXPOSÉ SOMMAIRE :\n${truncate(a.exposeSommaire ?? '(absent)', MAX_EXPOSE_CHARS)}`,
      '',
      precedents
        ? `PRÉCÉDENTS SIMILAIRES (indicatifs) :\n${precedents}`
        : 'PRÉCÉDENTS SIMILAIRES : aucun disponible',
    ].join('\n');
  }

  private parseResult(raw: string, checklist: string[]): LlmReviewResult {
    let parsed: Record<string, unknown>;
    try {
      // Certains modèles emballent le JSON dans des fences malgré response_format.
      const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 300)}`);
    }

    const regles: RegleAvis[] = Array.isArray(parsed.regles)
      ? (parsed.regles as RegleAvis[]).filter(
          (r) => r && typeof r.code === 'string',
        )
      : [];
    const sort = parsed.sort === 'IRRECEVABLE' ? 'IRRECEVABLE' : 'RECEVABLE';
    let motifCode =
      typeof parsed.motifCode === 'string' && MOTIFS[parsed.motifCode]
        ? parsed.motifCode
        : null;
    // Cohérence : IRRECEVABLE sans motif valide → reprendre la première règle IRRECEVABLE.
    if (sort === 'IRRECEVABLE' && !motifCode) {
      motifCode =
        regles.find((r) => r.avis === 'IRRECEVABLE' && MOTIFS[r.code])?.code ??
        checklist[0] ??
        null;
    }
    const confiance = clamp(Number(parsed.confiance), 0, 1);
    const justificatif =
      typeof parsed.justificatif === 'string' && parsed.justificatif.trim()
        ? parsed.justificatif.trim()
        : sort === 'IRRECEVABLE'
          ? 'Irrecevabilité suggérée — voir le détail des règles examinées.'
          : 'Aucune règle de recevabilité enfreinte au terme de l’examen.';

    return { regles, sort, motifCode, confiance, justificatif };
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}\n[… tronqué]`;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(max, Math.max(min, n));
}
