/**
 * Prueba el lector de CV (lib/cv.ts) con un PDF local, sin navegador:
 *   npx tsx scripts/probar-cv.ts ruta/al/cv.pdf
 * Imprime las líneas que salen del PDF y el perfil que se arma con ellas.
 */
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { itemsToLines, parseCv } from "../lib/cv";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Uso: npx tsx scripts/probar-cv.ts ruta/al/cv.pdf");
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)) }).promise;
  const lines: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const items = content.items.flatMap((i) => ("str" in i ? [{ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width }] : []));
    lines.push(...itemsToLines(items));
  }
  console.log(lines.map((l, i) => `${String(i).padStart(3)} ${l}`).join("\n"));
  console.log("\n" + JSON.stringify(parseCv(lines), null, 2));
}

main();
