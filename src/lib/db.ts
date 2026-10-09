/**
 * Veri tabanı katmanı — iki sürücü, tek arayüz (hepsi eşzamansız):
 *
 *  - "turso": TURSO_DATABASE_URL tanımlıysa Turso (libSQL) bulut veri tabanı.
 *             Netlify gibi sunucusuz ortamlarda kullanılır (saf JavaScript, yerel modül gerekmez).
 *  - "file":  Tanımlı değilse yerel SQLite dosyası (Node'un yerleşik `node:sqlite` modülü).
 *             Geliştirme ve kendi sunucunuzda (VPS) kullanım içindir: ./data/berberadam.db
 *
 * Şema ilk bağlantıda otomatik oluşturulur ve örnek içerikle doldurulur.
 * Admin şifresi (varsayılan 000000) bcrypt ile hashlenmiş olarak saklanır.
 */
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import type { BookingSettings } from "./types";

export const DEFAULT_ADMIN_PASSWORD = "000000";

export type Arg = string | number | null;
export type Row = Record<string, unknown>;
export type Stmt = string | { sql: string; args?: Arg[] };
export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}
export interface BatchResult extends RunResult {
  rows: Row[];
}

export interface Db {
  readonly driver: "turso" | "file";
  all<T = Row>(sql: string, args?: Arg[]): Promise<T[]>;
  get<T = Row>(sql: string, args?: Arg[]): Promise<T | undefined>;
  run(sql: string, args?: Arg[]): Promise<RunResult>;
  /** Tüm ifadeleri TEK atomik işlemde çalıştırır; biri hata verirse hepsi geri alınır. */
  batch(statements: Stmt[]): Promise<BatchResult[]>;
}

declare global {
  // Geliştirme modunda hot-reload sırasında bağlantının tekrar kurulmasını önler.
  var __berberadamDb: Promise<Db> | undefined;
}

const normalize = (s: Stmt): { sql: string; args: Arg[] } => (typeof s === "string" ? { sql: s, args: [] } : { sql: s.sql, args: s.args ?? [] });

// ---------------------------------------------------------------------------
// Sürücü 1: yerel dosya (node:sqlite)
// ---------------------------------------------------------------------------
function createFileDb(filePath: string): Db {
  // process.getBuiltinModule, paketleyicilerin (bundler) modülü yanlışlıkla çözmeye çalışmasını önler.
  const sqlite = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const handle = new sqlite.DatabaseSync(filePath);
  handle.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  const plain = (r: unknown): Row => ({ ...(r as Row) });
  const returnsRows = (sql: string) => /^\s*(select|with|pragma)\b/i.test(sql) || /\breturning\b/i.test(sql);

  const exec = (s: Stmt): BatchResult => {
    const { sql, args } = normalize(s);
    const stmt = handle.prepare(sql);
    if (returnsRows(sql)) return { rows: stmt.all(...args).map(plain), changes: 0, lastInsertRowid: 0 };
    const r = stmt.run(...args);
    return { rows: [], changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  };

  return {
    driver: "file",
    async all<T>(sql: string, args: Arg[] = []) {
      return handle.prepare(sql).all(...args).map(plain) as T[];
    },
    async get<T>(sql: string, args: Arg[] = []) {
      const r = handle.prepare(sql).get(...args);
      return r ? (plain(r) as T) : undefined;
    },
    async run(sql: string, args: Arg[] = []) {
      const { changes, lastInsertRowid } = exec({ sql, args });
      return { changes, lastInsertRowid };
    },
    async batch(statements: Stmt[]) {
      // Tamamı eşzamanlı çalıştığı için Node.js tek iş parçacığında başka istek araya giremez.
      handle.exec("BEGIN IMMEDIATE");
      try {
        const out = statements.map(exec);
        handle.exec("COMMIT");
        return out;
      } catch (err) {
        handle.exec("ROLLBACK");
        throw err;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Sürücü 2: Turso (libSQL) — HTTP üzerinden, saf JavaScript
// ---------------------------------------------------------------------------
async function createTursoDb(url: string, authToken?: string): Promise<Db> {
  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url, authToken: authToken || undefined });

  type ResultSet = Awaited<ReturnType<typeof client.execute>>;
  const rowsOf = (rs: ResultSet): Row[] =>
    rs.rows.map((r) => {
      const o: Row = {};
      rs.columns.forEach((c, i) => {
        const v = r[i];
        o[c] = typeof v === "bigint" ? Number(v) : v;
      });
      return o;
    });
  const infoOf = (rs: ResultSet): BatchResult => ({
    rows: rowsOf(rs),
    changes: rs.rowsAffected,
    lastInsertRowid: rs.lastInsertRowid === undefined ? 0 : Number(rs.lastInsertRowid),
  });

  return {
    driver: "turso",
    async all<T>(sql: string, args: Arg[] = []) {
      return rowsOf(await client.execute({ sql, args })) as T[];
    },
    async get<T>(sql: string, args: Arg[] = []) {
      return rowsOf(await client.execute({ sql, args }))[0] as T | undefined;
    },
    async run(sql: string, args: Arg[] = []) {
      const { changes, lastInsertRowid } = infoOf(await client.execute({ sql, args }));
      return { changes, lastInsertRowid };
    },
    async batch(statements: Stmt[]) {
      const results = await client.batch(statements.map(normalize), "write");
      return results.map(infoOf);
    },
  };
}

// ---------------------------------------------------------------------------
// Şema
// ---------------------------------------------------------------------------
const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS admin (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT    NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 1,
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price       INTEGER NOT NULL CHECK (price >= 0),
    duration    INTEGER NOT NULL CHECK (duration > 0),
    icon        TEXT    NOT NULL DEFAULT 'scissors',
    popular     INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    title      TEXT    NOT NULL DEFAULT '',
    active     INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    phone      TEXT    NOT NULL UNIQUE,
    email      TEXT    NOT NULL DEFAULT '',
    notes      TEXT    NOT NULL DEFAULT '',
    is_demo    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    staff_id    INTEGER NOT NULL REFERENCES staff(id),
    date        TEXT    NOT NULL,
    start_time  TEXT    NOT NULL,
    end_time    TEXT    NOT NULL,
    duration    INTEGER NOT NULL,
    total_price INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','completed','cancelled')),
    note        TEXT    NOT NULL DEFAULT '',
    is_demo     INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_appt_date_staff ON appointments(date, staff_id)`,
  `CREATE INDEX IF NOT EXISTS idx_appt_customer ON appointments(customer_id)`,
  `CREATE TABLE IF NOT EXISTS appointment_services (
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,
    name           TEXT    NOT NULL,
    price          INTEGER NOT NULL,
    duration       INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_appt_services ON appointment_services(appointment_id)`,
  // weekday: 0 = Pazar … 6 = Cumartesi (JavaScript getDay ile aynı)
  `CREATE TABLE IF NOT EXISTS working_hours (
    weekday    INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
    is_open    INTEGER NOT NULL DEFAULT 1,
    open_time  TEXT    NOT NULL DEFAULT '09:00',
    close_time TEXT    NOT NULL DEFAULT '21:00'
  )`,
  // Tatil / özel kapalı günler. start_time boşsa tüm gün; staff_id boşsa tüm dükkan.
  `CREATE TABLE IF NOT EXISTS closures (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT    NOT NULL,
    start_time TEXT,
    end_time   TEXT,
    staff_id   INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    reason     TEXT    NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS idx_closures_date ON closures(date)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT    NOT NULL,
    approved   INTEGER NOT NULL DEFAULT 1,
    is_demo    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,
  // SMS / WhatsApp bildirim simülasyonu günlüğü
  `CREATE TABLE IF NOT EXISTS notifications (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    channel        TEXT NOT NULL,
    recipient      TEXT NOT NULL,
    message        TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  // Hız sınırlayıcı sayaçları (sunucusuz ortamda bellek paylaşılmadığı için veri tabanında tutulur)
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key      TEXT PRIMARY KEY,
    count    INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
  )`,
];

/** Tablo boşsa tüm satırları TEK ifadede ekler (eşzamanlı iki soğuk başlangıçta bile çift kayıt oluşmaz). */
function seedOnce(table: string, columns: string[], rows: Arg[][]): Stmt {
  const group = `(${columns.map(() => "?").join(",")})`;
  return {
    sql: `INSERT INTO ${table} (${columns.join(",")}) SELECT * FROM (VALUES ${rows.map(() => group).join(",")}) WHERE NOT EXISTS (SELECT 1 FROM ${table})`,
    args: rows.flat(),
  };
}

async function seed(db: Db, counts: Record<string, number>) {
  const stmts: Stmt[] = [];

  // --- Admin: varsayılan şifre 000000 (bcrypt) ---
  if (!counts.admin) {
    // Sunucuya kurulumda ADMIN_INITIAL_PASSWORD verilirse varsayılan 000000 yerine o kullanılır;
    // böylece site internete açıldığı anda herkesin bildiği bir şifre geçerli olmaz.
    const fromEnv = process.env.ADMIN_INITIAL_PASSWORD?.trim();
    if (fromEnv && fromEnv.length < 6) console.warn("[BERBERADAM] ADMIN_INITIAL_PASSWORD en az 6 karakter olmalı; varsayılan şifre kullanıldı.");
    const initial = fromEnv && fromEnv.length >= 6 ? fromEnv : DEFAULT_ADMIN_PASSWORD;
    stmts.push({
      sql: "INSERT INTO admin (id, password_hash) SELECT 1, ? WHERE NOT EXISTS (SELECT 1 FROM admin)",
      args: [bcrypt.hashSync(initial, 12)],
    });
  }

  // --- Çalışma saatleri: Pazartesi–Cumartesi 09:00–21:00, Pazar kapalı ---
  if (!counts.hours) {
    for (let d = 0; d <= 6; d++) {
      stmts.push({
        sql: "INSERT OR IGNORE INTO working_hours (weekday, is_open, open_time, close_time) VALUES (?, ?, '09:00', '21:00')",
        args: [d, d === 0 ? 0 : 1],
      });
    }
  }

  // --- Ayarlar ---
  for (const [k, v] of [["slot_step", "30"], ["min_notice_minutes", "30"], ["horizon_days", "30"]]) {
    stmts.push({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", args: [k, v] });
  }

  // --- Personel (örnek; admin panelinden değiştirilebilir) ---
  if (!counts.staff) {
    stmts.push(
      seedOnce("staff", ["name", "title", "sort_order"], [
        ["Ahmet Usta", "Kıdemli Usta Berber", 1],
        ["Mehmet Usta", "Sakal & Cilt Bakımı Uzmanı", 2],
        ["Emre", "Berber", 3],
      ]),
    );
  }

  // --- Hizmetler (örnek fiyatlar; admin panelinden güncellenir) ---
  if (!counts.services) {
    stmts.push(
      seedOnce("services", ["name", "description", "price", "duration", "icon", "popular", "sort_order"], [
        ["Saç Kesimi", "Yüz hattınıza uygun kesim, yıkama ve şekillendirme.", 400, 45, "scissors", 1, 1],
        ["Sakal Şekillendirme", "Sıcak havlu, ustura detayı ve sakal bakım yağı.", 250, 30, "razor", 0, 2],
        ["Saç + Sakal", "Saç kesimi ve sakal tasarımı tek pakette.", 600, 75, "flame", 1, 3],
        ["Cilt Bakımı", "Derin temizlik, peeling, maske ve nemlendirme.", 450, 40, "sparkles", 0, 4],
        ["VIP Paket", "Saç, sakal, cilt bakımı, masaj ve ikram — komple bakım.", 1200, 120, "crown", 0, 5],
        ["Çocuk Tıraşı", "12 yaş altı için sabırlı ve eğlenceli tıraş.", 300, 30, "baby", 0, 6],
      ]),
    );
  }

  // --- Örnek yorumlar (is_demo=1: admin panelinden tek tıkla temizlenebilir) ---
  if (!counts.reviews) {
    stmts.push(
      seedOnce("reviews", ["name", "rating", "comment", "is_demo", "created_at"], [
        ["Murat K.", 5, "Fade kesimde şehirdeki en temiz işçilik. Randevu saatine tam uyuyorlar, beklemek yok.", 1, "2026-08-14 12:10:00"],
        ["Serkan A.", 5, "Sakal tasarımı için geldim, sıcak havlu ve ustura detayı müthişti. Kesinlikle tavsiye ederim.", 1, "2026-08-30 18:45:00"],
        ["Can Y.", 4, "Ortam çok temiz ve şık. Online randevu sistemi gerçekten işimi kolaylaştırdı.", 1, "2026-09-05 10:20:00"],
        ["Emre T.", 5, "VIP paketi denedim, cilt bakımı ve masaj sonrası yenilenmiş gibi hissettim.", 1, "2026-09-21 20:05:00"],
      ]),
    );
  }

  await db.batch(stmts);
}

// ---------------------------------------------------------------------------
// Bağlantı
// ---------------------------------------------------------------------------
async function connect(): Promise<Db> {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (url) return createTursoDb(url, process.env.TURSO_AUTH_TOKEN?.trim());

  if (process.env.NETLIFY || process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL tanımlı değil. Bu ortamda dosya sistemi kalıcı olmadığı için Turso veri tabanı gerekir (bkz. DEPLOY.md).",
    );
  }
  const filePath = process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "berberadam.db");
  return createFileDb(filePath);
}

async function init(): Promise<Db> {
  const db = await connect();
  // Şemayı oluştur (idempotent) ve hangi tabloların boş olduğunu AYNI turda öğren
  const results = await db.batch([
    ...SCHEMA_STATEMENTS,
    `SELECT (SELECT COUNT(*) FROM admin) AS admin, (SELECT COUNT(*) FROM working_hours) AS hours,
            (SELECT COUNT(*) FROM staff) AS staff, (SELECT COUNT(*) FROM services) AS services,
            (SELECT COUNT(*) FROM reviews) AS reviews`,
  ]);
  const counts = results[results.length - 1].rows[0] as Record<string, number>;
  if (Object.values(counts).some((n) => !n)) {
    await seed(db, counts);
  }
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__berberadamDb) {
    globalThis.__berberadamDb = init().catch((err) => {
      globalThis.__berberadamDb = undefined; // bir sonraki istekte yeniden dene
      throw err;
    });
  }
  return globalThis.__berberadamDb;
}

// ---------------------------------------------------------------------------
// Ayarlar
// ---------------------------------------------------------------------------
export async function getBookingSettings(db?: Db): Promise<BookingSettings> {
  const conn = db ?? (await getDb());
  const rows = await conn.all<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('slot_step', 'min_notice_minutes', 'horizon_days')",
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const num = (k: string, fallback: number) => {
    const n = Number(map[k]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    slotStep: num("slot_step", 30),
    minNoticeMinutes: Math.max(0, Number(map["min_notice_minutes"] ?? 30) || 0),
    horizonDays: num("horizon_days", 30),
  };
}

export async function saveBookingSettings(settings: BookingSettings, db?: Db): Promise<void> {
  const conn = db ?? (await getDb());
  const up = "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value";
  await conn.batch([
    { sql: up, args: ["slot_step", String(settings.slotStep)] },
    { sql: up, args: ["min_notice_minutes", String(settings.minNoticeMinutes)] },
    { sql: up, args: ["horizon_days", String(settings.horizonDays)] },
  ]);
}
