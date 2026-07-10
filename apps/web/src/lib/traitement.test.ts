import { test } from "node:test";
import assert from "node:assert/strict";
import { amendements, type Decision } from "../data/fixtures.ts";
import { csvDerouleur, csvIrrecevables, progression } from "./traitement.ts";

const decisions: Record<string, Decision> = {
  CD142: {
    sort: "irrecevable",
    motifType: "IRR-40 charge",
    motifTexte: "Charge publique nouvelle ; « guillemets » et point-virgule.",
  },
  CD161: { sort: "irrecevable", motifType: "IRR-40 ressource", motifTexte: "Gage insuffisant." },
  CD155: { sort: "recevable" },
  CD146: { sort: "retiré" },
};

test("progression ventile par gravité et compte les cas évidents restants", () => {
  const p = progression(amendements, decisions);
  assert.equal(p.total, amendements.length);
  assert.equal(p.traites, 4);
  assert.equal(p.irrecevables, 2);
  assert.equal(p.bloquants, 1); // IRR-40 charge : définitif
  assert.equal(p.attention, 1); // IRR-40 ressource : curable
  // non traités à signal fort : CD87, CD101, CD147, CD158 (CD160/CD161 sont à vérifier)
  assert.equal(p.evidentsRestants, 4);
});

test("csvIrrecevables : uniquement les irrecevables, dans l'ordre d'appel, champs échappés", () => {
  const lignes = csvIrrecevables(amendements, decisions).split("\r\n");
  assert.equal(lignes.length, 3); // en-tête + CD161 (ordre 2) + CD142 (ordre 4)
  assert.ok(lignes[1].startsWith("2;CD161;"));
  assert.ok(lignes[2].startsWith("4;CD142;"));
  assert.ok(lignes[2].includes('"Charge publique nouvelle ; « guillemets » et point-virgule."'));
  assert.ok(lignes[2].includes("article 89 du Règlement"));
});

test("csvDerouleur : une ligne par amendement, trié par ordre d'appel, décisions reflétées", () => {
  const lignes = csvDerouleur(amendements, decisions).split("\r\n");
  assert.equal(lignes.length, 1 + amendements.length);
  assert.ok(lignes[1].startsWith("1;CD160;"));
  assert.ok(lignes[1].includes("present"));
  assert.ok(lignes[1].includes("dc tva-renov-art2"));
  assert.ok(lignes[1].includes("à instruire"));
  const cd146 = lignes.find((l) => l.includes(";CD146;"));
  assert.ok(cd146?.includes("retiré"));
  assert.ok(cd146?.includes("id supp-art4"));
});
