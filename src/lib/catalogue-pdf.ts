// A deliberately small text-only PDF writer. No uploaded PDF, HTML, URL, script,
// action, annotation, embedded file or untrusted PDF syntax enters the document.
export type CatalogueDocument = {
  title: string;
  lines: {
    name: string;
    description: string;
    moq: number | null;
    leadDays: number | null;
    pricePaise: number | null;
  }[];
};
const plain = (s: string) => {
  const value = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u20b9/g, "INR ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
  if (/[^\x20-\x7e]/.test(value))
    throw new Error(
      "Catalogue PDF currently supports Latin text. Please use Latin catalogue wording before publication.",
    );
  return value;
};
const literal = (s: string) => plain(s).replace(/[\\()]/g, "\\$&");
export function cataloguePdf(doc: CatalogueDocument): Buffer {
  const lines = [
    plain(doc.title),
    "Prices and requested dates are subject to owner quotation.",
    "",
    ...doc.lines
      .slice(0, 100)
      .flatMap((p) => [
        p.name,
        `MOQ: ${p.moq ?? "confirm"} | Preparation days: ${p.leadDays ?? "confirm"} | ${p.pricePaise === null ? "Price on request" : `From INR ${(p.pricePaise / 100).toFixed(2)}`}`,
        p.description,
        "",
      ]),
  ].flatMap((s) => {
    const words = plain(s).match(/.{1,85}(?:\s|$)|.{1,85}/g);
    return words?.map((w) => w.trim()) ?? [""];
  });
  const pages: string[][] = [];
  for (let n = 0; n < lines.length; n += 43) pages.push(lines.slice(n, n + 43));
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const kids: number[] = [];
  for (const [i, rows] of pages.entries()) {
    const page = objects.length + 1,
      content = page + 1;
    kids.push(page);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`,
    );
    const stream = `BT /F1 11 Tf 50 790 Td 16 TL ${[...rows, "", `Page ${i + 1} of ${pages.length}`].map((s, n) => `${n ? "T* " : ""}(${literal(s)}) Tj`).join("\n")} ET`;
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [i, o] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
