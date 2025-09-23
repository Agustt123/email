// lib/smtpCache.js
const smtpCache = new Map();
/**
 * Valor almacenado:
 * {
 *   cfg: { host, puerto, user, pass },
 *   ts: number (Date.now())
 * }
 */

const TTL_MS = 5 * 60 * 1000; // 5 minutos

function getCachedSmtp(idempresa) {
    const entry = smtpCache.get(idempresa);
    if (!entry) return null;
    if (Date.now() - entry.ts > TTL_MS) {
        smtpCache.delete(idempresa);
        return null;
    }
    return entry.cfg;
}

function setCachedSmtp(idempresa, cfg) {
    smtpCache.set(idempresa, { cfg, ts: Date.now() });
}

function invalidateSmtp(idempresa) {
    smtpCache.delete(idempresa);
}

module.exports = { getCachedSmtp, setCachedSmtp, invalidateSmtp };
