type PdfSection = { title: string; subtitle?: string; rows: Array<{ label: string; value?: string; kind?: string }> };

function pdfText(value: unknown) {
  return String(value ?? "").normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/([\\()])/g, "\\$1");
}

function buildPdf(businessName: string, sections: PdfSection[]) {
  const objects: string[] = [];
  const pages: number[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalog = add("");
  const pagesRoot = add("");
  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  for (const section of sections.slice(0, 8)) {
    const commands: string[] = ["BT", "/F2 12 Tf", `1 0 0 1 56 790 Tm (${pdfText(businessName.toUpperCase())}) Tj`, "/F2 13 Tf", `1 0 0 1 56 770 Tm (${pdfText(section.title.toUpperCase())}) Tj`, "/F1 9 Tf", `1 0 0 1 56 754 Tm (${pdfText(section.subtitle || "")}) Tj`];
    let y = 724;
    for (const row of section.rows.slice(0, 48)) {
      const bold = row.kind === "section" || row.kind === "total" || row.kind === "final";
      const indent = row.kind === "detail" ? 68 : 56;
      commands.push(`/${bold ? "F2" : "F1"} ${bold ? 9.5 : 9} Tf`, `1 0 0 1 ${indent} ${y} Tm (${pdfText(row.label)}) Tj`);
      if (row.value) commands.push(`1 0 0 1 420 ${y} Tm (${pdfText(row.value)}) Tj`);
      if (row.kind === "final") commands.push(`${420} ${y - 3} m 535 ${y - 3} l S`, `${420} ${y - 6} m 535 ${y - 6} l S`);
      y -= row.kind === "section" ? 20 : 16;
    }
    commands.push("ET");
    const stream = commands.join("\n");
    const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    pages.push(add(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`;
  objects[pagesRoot - 1] = `<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(output.length); output += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as { businessName?: string; sections?: PdfSection[]; filename?: string };
  if (!payload.sections?.length) return Response.json({ error: "Tidak ada laporan untuk diekspor." }, { status: 400 });
  const bytes = buildPdf(payload.businessName || "UMKM Makanan Keluarga", payload.sections);
  const filename = (payload.filename || "laporan-keuangan.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
  return new Response(bytes as BodyInit, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"` } });
}
