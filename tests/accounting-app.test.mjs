import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses cloud persistence and exposes the requested controls", async () => {
  const [app, page, manifest] = await Promise.all([
    readFile(new URL("../public/app.js", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(app, /fetch\("\/api\/state"/);
  assert.doesNotMatch(app, /localStorage\.setItem/);
  assert.match(app, /Export XLSX/);
  assert.match(app, /Export PDF/);
  assert.match(page, /Master Barang/);
  assert.match(page, /Pengaturan/);
  assert.equal(JSON.parse(manifest).d1, "DB");
});

test("keeps the accounting report format", async () => {
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(app, /NERACA SALDO SETELAH PENYESUAIAN/);
  assert.match(app, /LAPORAN LABA RUGI/);
  assert.match(app, /LAPORAN PERUBAHAN MODAL/);
  assert.match(app, /LAPORAN POSISI KEUANGAN/);
});
