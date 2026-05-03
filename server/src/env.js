import { loadServerEnv } from './loadEnv.js';

loadServerEnv();

/**
 * Timeweb Cloud Postgres часто на *.twc1.net. Если в образ/окружение попал локальный server/.env с
 * PORT=3001, а healthcheck платформы ждёт свой порт (часто 8080), деплой «висит» бесконечно.
 * Явный PORT от оркестратора dotenv не перезапишет; этот случай — когда задан только .env.
 */
const dbUrl = process.env.DATABASE_URL ?? '';
if (dbUrl.includes('twc1.net') && String(process.env.PORT ?? '').trim() === '3001') {
  delete process.env.PORT;
}
