/**
 * Veri tabanı yedeği.
 *
 *  - Yerel dosya modu (varsayılan): SQLite dosyasının tutarlı bir kopyasını alır (sunucu çalışırken de güvenli).
 *      Çıktı: backups/berberadam-YYYY-MM-DD_HH-MM.db
 *  - Turso modu (TURSO_DATABASE_URL tanımlıysa): tüm tabloları JSON olarak dışa aktarır.
 *      Çıktı: backups/berberadam-YYYY-MM-DD_HH-MM.json   (şifre özeti ve oturum anahtarı dahil edilmez)
 *
 * Kullanım:  npm run backup        (son 14 yedek saklanır)
 * Ortam:     DATABASE_PATH, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BACKUP_DIR, BACKUP_KEEP
 *
 * Panelden de indirebilirsiniz: Admin → Ayarlar → Yedeği İndir.
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), "backups");
const keep = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);
const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
fs.mkdirSync(dir, { recursive: true });

let target;
if (tursoUrl) {
  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  const tables = ["services", "staff", "customers", "appointments", "appointment_services", "working_hours", "closures", "reviews", "notifications"];
  const out = { app: "BERBERADAM", exportedAt: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    const rs = await client.execute(`SELECT * FROM ${t}`);
    out.tables[t] = rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, typeof r[i] === "bigint" ? Number(r[i]) : r[i]])));
  }
  const settings = await client.execute("SELECT key, value FROM settings WHERE key != 'jwt_secret'");
  out.tables.settings = settings.rows.map((r) => ({ key: r[0], value: r[1] }));
  target = path.join(dir, `berberadam-${stamp}.json`);
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
} else {
  const source = process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "berberadam.db");
  if (!fs.existsSync(source)) {
    console.error(`Veri tabanı bulunamadı: ${source}`);
    process.exit(1);
  }
  const { DatabaseSync } = await import("node:sqlite");
  target = path.join(dir, `berberadam-${stamp}.db`);
  const db = new DatabaseSync(source);
  try {
    db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
}

// Eski yedekleri temizle
const old = fs
  .readdirSync(dir)
  .filter((f) => /^berberadam-.*\.(db|json)$/.test(f))
  .sort()
  .reverse()
  .slice(keep);
for (const f of old) fs.rmSync(path.join(dir, f), { force: true });

console.log(`✓ Yedek alındı: ${target} (${(fs.statSync(target).size / 1024).toFixed(0)} KB)${old.length ? ` · ${old.length} eski yedek silindi` : ""}`);
