import type { TextModificationType } from '../../../generated/prisma/client.js';

/** Injection token: every provider bound to this token is a citation extractor. */
export const CITATION_EXTRACTORS = Symbol('CITATION_EXTRACTORS');

/** Champs d'un amendement nécessaires à l'extraction des renvois. */
export interface AmendmentCitationInput {
  /** Dispositif de l'amendement. */
  content: string;
  exposeSommaire?: string | null;
  articleReference?: string | null;
  /** Renvoi structuré fourni par l'AN (code visé), quand présent. */
  loiReference?: { codeLoi?: string; divisionCodeLoi?: string } | null;
}

/**
 * Un renvoi extrait — miroir best-effort de commun.schema.json#/$defs/reference_normative.
 * Les champs parsés sont optionnels : ce qu'on ne sait pas rester `undefined` (jamais inventé).
 */
export interface ParsedReference {
  /** Chaîne source exacte (sert de clé d'idempotence avec `origin`). */
  rawCitation: string;
  /** = CitationExtractor.origin, discrimine la stratégie (cf. TextReference.origin). */
  origin: string;
  texteSource?: string;
  article?: string;
  typeModification?: TextModificationType;
  /** LEGIARTI/LEGITEXT si déjà connu (rare en V1, résolu par le harvester DILA). */
  identifiantLegi?: string;
}

/**
 * Port pluggable d'extraction des renvois d'un amendement vers le droit consolidé / la LFSS N-1.
 * V1 : champ AN (`AnLoiReferenceExtractor`) + regex (`RegexDispositifExtractor`). L'agent LLM
 * (origin="llm") s'ajoutera comme une implémentation de plus, sans toucher au schéma.
 */
export interface CitationExtractor {
  readonly origin: string;
  extract(input: AmendmentCitationInput): ParsedReference[];
}
