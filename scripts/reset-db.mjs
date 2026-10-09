/**
 * Veri tabanını sıfırlar: data/berberadam.db silinir, bir sonraki çalıştırmada
 * şema, örnek hizmetler/personel ve varsayılan admin şifresi (000000) yeniden oluşturulur.
 *
 * Kullanım:  npm run reset-db   (önce sunucuyu durdurun!)
 */
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH?.trim() || path.join(process.cwd(), "data", "berberadam.db");

let removed = 0;
for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
    removed++;
  }
}

console.log(removed ? `✓ Veri tabanı silindi (${dbPath}). Sunucu yeniden başladığında sıfırdan oluşturulacak.` : `Silinecek veri tabanı bulunamadı (${dbPath}).`);
