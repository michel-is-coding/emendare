import { strict as assert } from "node:assert";
import { test } from "node:test";
import { htmlVersTexte } from "./html.ts";

test("décode les entités et retire les balises du HTML AN", () => {
  const brut =
    '<p style="text-align: justify;">&#x00C0; la premi&#x00E8;re phrase de l&#x2019;alin&#x00E9;a&nbsp;3, supprimer les mots&nbsp;:</p><p>&#x00AB;&nbsp;, France M&#x00E9;dias Monde&nbsp;&#x00BB;.</p>';
  assert.equal(
    htmlVersTexte(brut),
    "À la première phrase de l’alinéa 3, supprimer les mots :\n« , France Médias Monde ».",
  );
});

test("laisse le texte simple inchangé", () => {
  assert.equal(htmlVersTexte("Texte sans balises."), "Texte sans balises.");
});
