// notificarEnvio.js
const nodemailer = require('nodemailer');
const { executeQuery } = require('../dbconfig');

const isHtml = (s = '') => /<\/?[a-z][\s\S]*>/i.test(s);
const toHtml = (s = '') => (isHtml(s) ? s : `<p>${s.replace(/\n/g, '<br>')}</p>`);
const toText = (s = '') => s.replace(/<[^>]*>/g, '');
const fmt = (p) => (p?.nombre ? `"${p.nombre}" <${p.email}>` : p?.email || undefined);

/**
 * Envía un mail por SMTP y, salvo que idlinea == -1, actualiza envios_historial.
 */
async function notificarEnvio({ idlinea, dataservidor, dataemail }, connection, log = false) {
    // Validaciones mínimas
    if (!dataemail?.destinatario?.email) return { ok: false, updated: false, error: 'Falta destinatario.email' };
    if (!dataservidor?.host || !dataservidor?.puerto) return { ok: false, updated: false, error: 'Falta host/puerto SMTP' };

    const port = Number(dataservidor.puerto);
    const transporter = nodemailer.createTransport({
        host: dataservidor.host,
        port,
        secure: dataservidor.secure ?? (port === 465),  // true si 465 (SSL), false si 587 (STARTTLS)
        requireTLS: port !== 465,
        auth: (dataservidor.user && dataservidor.pass) ? { user: dataservidor.user, pass: dataservidor.pass } : undefined,
        tls: { minVersion: 'TLSv1.2' },
    });

    const mensaje = {
        from: fmt({ nombre: 'JN Logística', email: dataservidor.user || 'no-reply@localhost' }),
        to: fmt(dataemail.destinatario),
        cc: fmt(dataemail.copia),
        subject: dataemail.asunto || '(sin asunto)',
        html: toHtml(dataemail.cuerpo || ''),
        text: toText(dataemail.cuerpo || ''),
    };

    const onlySend = Number(idlinea) === -1;

    try {
        const info = await transporter.sendMail(mensaje);

        if (!onlySend) {
            await executeQuery(connection, 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?', [idlinea], log);
        }

        return { ok: true, updated: !onlySend, messageId: info?.messageId };
    } catch (e) {
        // si falla, solo marcamos ERROR cuando corresponde actualizar
        if (!onlySend) {
            await executeQuery(connection, "UPDATE envios_historial SET notificado = NOW(), estado = 'ERROR' WHERE id = ?", [idlinea], log).catch(() => { });
        }
        return { ok: false, updated: !onlySend, error: String(e.response || e.message) };
    }
}

module.exports = { notificarEnvio };
