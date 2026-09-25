import Database from "@tauri-apps/plugin-sql";

import { connectWidgets, requestWidgetSync } from "./widgets/sync";
import { queueSync, syncNow } from './cloud-sync';

let connection: Promise<Database> | undefined;
export function getDatabase(): Promise<Database> {
  connection ??= Database.load("sqlite:krmf.db").then(db => {
    const execute = db.execute.bind(db);
    db.execute = async (query, values) => {
      const result = await execute(query, values);
      requestWidgetSync();
      if (!query.includes('_krmf_companion_state')) queueSync(db);
      return result;
    };
    connectWidgets(db);
    void syncNow(db);
    return db;
  }).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}
