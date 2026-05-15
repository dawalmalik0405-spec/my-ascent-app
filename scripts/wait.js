/** Brief pause after docker infra starts (used by npm start). */
const ms = Number(process.env.INFRA_WAIT_MS || 15000);
console.log(`Waiting ${ms / 1000}s for Postgres, Redis, Qdrant, Temporal...`);
setTimeout(() => process.exit(0), ms);
