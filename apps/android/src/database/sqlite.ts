import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { INITIAL_PHOTO_PRINT_PRICES } from '@trending-studio/pricing-engine';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('trending_studio.db');

  // Execute schema creation
  await dbInstance.execAsync(CREATE_TABLES_SQL);

  // Seed default photo print sizes into SQLite if empty
  const countRes = await dbInstance.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM photo_print_prices'
  );

  if (!countRes || countRes.count === 0) {
    for (const p of INITIAL_PHOTO_PRINT_PRICES) {
      await dbInstance.runAsync(
        'INSERT OR REPLACE INTO photo_print_prices (id, size, width, height, base_price, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [`print_${p.size}`, p.size.toUpperCase(), p.width, p.height, p.price, 1]
      );
    }
  }

  return dbInstance;
}
