import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../astrolith.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Error connecting to SQLite database:', err.message);
  } else {
    console.log(`[DB] Connected to SQLite database at ${dbPath}`);
  }
});

// Initialize database with schema.sql
export function initDB() {
  return new Promise((resolve, reject) => {
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    
    fs.readFile(schemaPath, 'utf8', (err, sql) => {
      if (err) {
        return reject(new Error(`Failed to read schema.sql: ${err.message}`));
      }

      db.exec(sql, (execErr) => {
        if (execErr) {
          return reject(new Error(`Failed to execute schema.sql: ${execErr.message}`));
        }
        
        // Ensure modular columns exist on Fleet table
        db.all('PRAGMA table_info(Fleet)', [], (pragmaErr, columns) => {
          if (pragmaErr) {
            console.log('[DB] Schema and PRAGMAs initialized successfully.');
            return resolve();
          }

          const colNames = new Set((columns || []).map((c) => c.name));
          const migrations = [];

          if (!colNames.has('name')) migrations.push("ALTER TABLE Fleet ADD COLUMN name TEXT DEFAULT 'Vessel-Alpha'");
          if (!colNames.has('hull_class')) migrations.push("ALTER TABLE Fleet ADD COLUMN hull_class TEXT DEFAULT 'Class-II Mining Rig'");
          if (!colNames.has('base_extraction_rate')) migrations.push("ALTER TABLE Fleet ADD COLUMN base_extraction_rate REAL DEFAULT 2.0");
          if (!colNames.has('transit_speed')) migrations.push("ALTER TABLE Fleet ADD COLUMN transit_speed REAL DEFAULT 1.0");
          if (!colNames.has('cargo_capacity')) migrations.push("ALTER TABLE Fleet ADD COLUMN cargo_capacity REAL DEFAULT 10000.0");
          if (!colNames.has('max_power')) migrations.push("ALTER TABLE Fleet ADD COLUMN max_power INTEGER DEFAULT 100");
          if (!colNames.has('max_tonnage')) migrations.push("ALTER TABLE Fleet ADD COLUMN max_tonnage INTEGER DEFAULT 50");
          if (!colNames.has('modules')) migrations.push("ALTER TABLE Fleet ADD COLUMN modules TEXT DEFAULT '[]'");

          // Check Sectors table columns
          db.all('PRAGMA table_info(Sectors)', [], (secErr, secCols) => {
            const secNames = new Set((secCols || []).map((c) => c.name));
            if (!secNames.has('is_temporary')) migrations.push('ALTER TABLE Sectors ADD COLUMN is_temporary INTEGER DEFAULT 0');
            if (!secNames.has('expires_at')) migrations.push('ALTER TABLE Sectors ADD COLUMN expires_at INTEGER DEFAULT NULL');
            if (!secNames.has('name')) migrations.push("ALTER TABLE Sectors ADD COLUMN name TEXT DEFAULT 'Sector'");

            if (migrations.length === 0) {
              console.log('[DB] Schema and PRAGMAs initialized successfully.');
              return resolve();
            }

            let pending = migrations.length;
            migrations.forEach((stmt) => {
              db.run(stmt, () => {
                pending -= 1;
                if (pending === 0) {
                  console.log(`[DB] Executed ${migrations.length} column migrations on database tables.`);
                  console.log('[DB] Schema and PRAGMAs initialized successfully.');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
}
