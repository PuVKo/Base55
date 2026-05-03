import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const serverRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Загружает server/.env, затем корневой .env.local (перекрывает ключи). */
export function loadServerEnv() {
  dotenv.config({ path: path.join(serverRoot, '.env') });
  const rootEnvLocal = path.join(serverRoot, '..', '.env.local');
  if (fs.existsSync(rootEnvLocal)) {
    dotenv.config({ path: rootEnvLocal, override: true });
  }
}
