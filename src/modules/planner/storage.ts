import { getDatabase } from '../../lib/database';
let queue: Promise<void> = Promise.resolve();
export function writePlanner(sql: string, values: unknown[]): Promise<void> {
  const operation = queue.then(async () => { const db = await getDatabase(); await db.execute(sql, values); });
  queue = operation.catch(() => {});
  return operation;
}
export async function plannerDatabase() { await queue; return getDatabase(); }
