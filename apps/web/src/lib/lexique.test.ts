import { test } from "node:test";
import assert from "node:assert/strict";
import { marquerTexte, reperer } from "./lexique.ts";

test("repère un terme conjugué du lexique (« verse » ← Verser)", () => {
  const occ = reperer("L'État verse à chaque collectivité une aide.");
  assert.equal(occ.length, 1);
  assert.equal(occ[0].famille, "Verser");
});

test("repère racine, dérivés et pluriels (subvention, dotations, financement)", () => {
  const occ = reperer("Une subvention annuelle et des dotations pour le financement.");
  assert.deepEqual(
    occ.map((o) => o.famille),
    ["Subvention", "Subvention", "Finances"],
  );
});

test("repère une expression de plusieurs mots (« prise en charge »)", () => {
  const occ = reperer("La prise en charge intégrale des frais.");
  assert.equal(occ.length, 1);
  assert.equal(occ[0].famille, "Accompagnement");
});

test("insensible aux accents et à la casse (Transférer / transfere)", () => {
  assert.equal(reperer("Il faut transférer les crédits.").length, 1);
  assert.equal(reperer("On transfère les crédits.").length, 1);
});

test("ne signale pas les mots voisins hors lexique (vers, verset, primeur)", () => {
  assert.equal(reperer("Vers le verset, la primeur du geste.").length, 0);
});

test("marquerTexte découpe en segments text / mot signalé aux bons offsets", () => {
  const segments = marquerTexte("L'État verse une dotation exceptionnelle.");
  assert.deepEqual(
    segments.map((s) => s.kind),
    ["text", "redflag", "text", "redflag", "text"],
  );
  const marques = segments.filter((s) => s.kind === "redflag");
  assert.deepEqual(
    marques.map((s) => s.text),
    ["verse", "dotation"],
  );
  // reconstruction : rien n'est perdu ni déplacé
  assert.equal(
    segments.map((s) => s.text).join(""),
    "L'État verse une dotation exceptionnelle.",
  );
});

test("laisse intacts les segments de rectification (modif)", () => {
  const segments = marquerTexte("Sans mot signalé ici.");
  assert.deepEqual(segments, [{ kind: "text", text: "Sans mot signalé ici." }]);
});
