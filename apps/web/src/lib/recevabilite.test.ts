import { test } from "node:test";
import assert from "node:assert/strict";
import { ligneArt45, verdict } from "./recevabilite.ts";

const signaux = (
  article_40: "aucun_signal" | "signal_charge" | "signal_ressource",
  article_45: "lien_direct" | "lien_indirect" | "lien_absent",
) => ({ article_40, article_45, justification: "" });

test("charge = error, jamais gageable, geste correctif nommé", () => {
  const v = verdict(signaux("signal_charge", "lien_direct"), undefined, undefined, "premiere");
  assert.equal(v.severite, "error");
  assert.match(v.corps, /aucun gage ne peut la couvrir/);
  assert.match(v.corps, /réécriture/);
});

test("ressource sans gage = warning, le gage manquant est nommé", () => {
  const v = verdict(signaux("signal_ressource", "lien_direct"), "absent", undefined, "premiere");
  assert.equal(v.severite, "warning");
  assert.match(v.corps, /Aucun gage/);
});

test("ressource avec gage présent = warning (à apprécier), le verdict bascule", () => {
  const sans = verdict(signaux("signal_ressource", "lien_direct"), "absent", undefined, "premiere");
  const avec = verdict(signaux("signal_ressource", "lien_direct"), "present", undefined, "premiere");
  assert.equal(avec.severite, "warning");
  assert.match(avec.corps, /Gage présent/);
  assert.notEqual(avec.corps, sans.corps);
});

test("aucun signal et lien conforme = success, jamais « recevable » péremptoire", () => {
  const v = verdict(signaux("aucun_signal", "lien_direct"), undefined, undefined, "premiere");
  assert.equal(v.severite, "success");
  assert.doesNotMatch(v.titre, /recevable/i);
  assert.match(v.corps, /sous réserve de l'appréciation/);
});

test("lien indirect en lecture ultérieure = warning (entonnoir)", () => {
  const v = verdict(signaux("aucun_signal", "lien_indirect"), undefined, undefined, "ulterieure");
  assert.equal(v.severite, "warning");
  assert.match(v.corps, /entonnoir/);
});

test("hors champ art. 40 explicité (garde anti-découragement)", () => {
  const v = verdict(
    signaux("aucun_signal", "lien_direct"),
    undefined,
    "demande_de_rapport",
    "premiere",
  );
  assert.equal(v.severite, "success");
  assert.match(v.corps, /hors champ de l'article 40/);
});

test("ligneArt45 change avec la lecture (règle de l'entonnoir)", () => {
  assert.match(ligneArt45("lien_indirect", "premiere"), /recevable en première lecture/);
  assert.match(ligneArt45("lien_indirect", "ulterieure"), /entonnoir/);
});
