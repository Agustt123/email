// controller/email.js
const nodemailer = require('nodemailer');
const { executeQuery, getnombre } = require('../dbconfig');
const { getCachedSmtp, setCachedSmtp, invalidateSmtp } = require('../lib/smtpCache');
const { loadSmtpFromDB } = require('../lib/loadSmtpFromDB');
const { buildTransporterConfig } = require('../lib/buildTransporterConfig');

const isHtml = (s = '') => /<\/?[a-z][\s\S]*>/i.test(s);
const toHtml = (s = '') => (isHtml(s) ? s : `<p>${s.replace(/\n/g, '<br>')}</p>`);
const toText = (s = '') => s.replace(/<[^>]*>/g, '');
const fmt = (p) => (p?.nombre ? `"${p.nombre}" <${p.email}>` : p?.email || undefined);

/**
 * Obtiene la config SMTP usando cache por empresa.
 * Si `forceRefresh` es true, ignora el cache y recarga de DB.
 */
async function getSmtpConfig(connection, idempresa, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getCachedSmtp(idempresa);
        if (cached) return cached;
    }
    const cfg = await loadSmtpFromDB(connection);
    setCachedSmtp(idempresa, cfg);
    return cfg;
}

/**
 * Envía un mail por SMTP y, salvo que idlinea == -1, actualiza envios_historial.
 * Usa cache en memoria por empresa para la config SMTP (mensajes_email).
 */
async function notificarEnvio({ idempresa, idlinea, dataemail }, connection, log = false) {
    // Validaciones mínimas del email
    if (!dataemail?.destinatario?.email) return { ok: false, updated: false, error: 'Falta destinatario.email' };
    const onlySend = Number(idlinea) === -1;

    // 1) Traer config (cache >> DB)
    let dataservidor;
    try {
        dataservidor = await getSmtpConfig(connection, idempresa, false);
    } catch (e) {
        return { ok: false, updated: false, error: e.message || String(e) };
    }
    const nombre = await getnombre(idempresa);
    // 2) Preparar mensaje
    const mensaje = {
        from: fmt({ nombre: nombre, email: dataservidor.user || 'no-reply@localhost' }),
        to: fmt(dataemail.destinatario),
        cc: fmt(dataemail.copia),
        subject: dataemail.asunto || '(sin asunto)',
        html: toHtml(dataemail.cuerpo || ''),
        text: toText(dataemail.cuerpo || ''),
    };

    // Función interna para enviar con una config dada
    async function trySend(ds) {
        const transporter = nodemailer.createTransport(buildTransporterConfig(ds));
        return transporter.sendMail(mensaje);
    }

    try {
        // 3) Primer intento con cache/DB
        const info = await trySend(dataservidor);

        if (!onlySend) {
            await executeQuery(connection, 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?', [idlinea], log);
        }
        return { ok: true, updated: !onlySend, messageId: info?.messageId };

    } catch (e1) {
        // 4) Si falla por auth/conexión, invalidar cache y reintentar 1 vez forzando refresh
        const transient =
            ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNRESET'].includes(e1.code) ||
            [421, 454, 534, 535, 530].includes(e1.responseCode);

        if (transient) {
            try {
                invalidateSmtp(idempresa);
                const fresh = await getSmtpConfig(connection, idempresa, true);
                const info2 = await trySend(fresh);

                if (!onlySend) {
                    await executeQuery(connection, 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?', [idlinea], log);
                }
                return { ok: true, updated: !onlySend, messageId: info2?.messageId };
            } catch (e2) {
                // cae al manejo común abajo
                e1.message = `${e1.message} | retry_failed: ${e2.message || e2}`;
            }
        }

        // 5) Marcar ERROR cuando corresponde y devolver detalle
        const errorInfo = [
            e1.code && `code=${e1.code}`,
            e1.responseCode && `smtp=${e1.responseCode}`,
            e1.command && `cmd=${e1.command}`,
            e1.response && `resp=${e1.response}`,
            e1.message && `msg=${e1.message}`,
        ].filter(Boolean).join(' | ');

        if (!onlySend) {

        }
        return { ok: false, updated: !onlySend, error: errorInfo || 'SMTP error' };
    }
}

module.exports = { notificarEnvio };
