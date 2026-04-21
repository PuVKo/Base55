/**
 * Подключается первым из index.js: лог в stderr до тяжёлых импортов (Prisma, сессии).
 * writeSync(2) — без буфера, чтобы Timeweb показал строку до «готовности» приложения.
 */
import fs from 'node:fs';

const ts = () => new Date().toISOString();

const earlyLine = `[Base56:early] ${ts()} cwd=${process.cwd()} argv=${JSON.stringify(process.argv.slice(0, 3))} PORT=${process.env.PORT ?? ''} NODE_ENV=${process.env.NODE_ENV ?? ''}\n`;
try {
  fs.writeSync(2, earlyLine);
} catch {
  console.error(earlyLine.trim());
}

function dieSync(label, err) {
  const msg = `[Base56:early] ${ts()} ${label} ${err instanceof Error ? err.stack : String(err)}\n`;
  try {
    fs.writeSync(2, msg);
  } catch {
    console.error(msg.trim());
  }
  process.exit(1);
}

process.on('uncaughtException', (err) => dieSync('uncaughtException', err));

process.on('unhandledRejection', (reason) => dieSync('unhandledRejection', reason));
