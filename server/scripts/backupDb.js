import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../astrolith.db');
const backupDir = path.resolve(__dirname, '../backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `astrolith_backup_${timestamp}.db`);

console.log(`[Backup] Initiating online atomic database backup...`);
console.log(`[Backup] Source: ${dbPath}`);
console.log(`[Backup] Destination: ${backupPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[Backup] Failed to connect to source DB:', err.message);
    process.exit(1);
  }

  // Force WAL checkpoint before backup
  db.run('PRAGMA wal_checkpoint(TRUNCATE)', (ckptErr) => {
    if (ckptErr) {
      console.warn('[Backup] Checkpoint warning:', ckptErr.message);
    }

    db.run(`VACUUM INTO '${backupPath.replace(/\\/g, '/')}'`, (vacErr) => {
      if (vacErr) {
        console.error('[Backup] VACUUM INTO failed, falling back to file copy:', vacErr.message);
        try {
          fs.copyFileSync(dbPath, backupPath);
          console.log(`[Backup] Fallback copy completed: ${backupPath}`);
        } catch (copyErr) {
          console.error('[Backup] Copy failed:', copyErr.message);
          process.exit(1);
        }
      } else {
        console.log(`[Backup] Online hot backup created successfully: ${backupPath}`);
      }

      db.close(() => {
        console.log('[Backup] Operation finished cleanly.');
        process.exit(0);
      });
    });
  });
});
