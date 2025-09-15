// notificarEnvio.js
const nodemailer = require('nodemailer');
const { executeQuery } = require('../dbconfig');


/**
 * Envia un mail y actualiza envios_historial usando tu executeQuery(connection, query, values, log)
 */
async function notificarEnvio({ idlinea, dataservidor, dataemail }, connection, log = false) {
    const transporter = nodemailer.createTransport({
        host: dataservidor.host,
        port: Number(dataservidor.puerto),
        secure: dataservidor.secure ?? (Number(dataservidor.puerto) === 465),
        auth: { user: dataservidor.user, pass: dataservidor.pass },
        requireTLS: Number(dataservidor.puerto) !== 465,
        tls: { minVersion: 'TLSv1.2' },
    });

    const fmt = (p) => (p?.nombre ? `"${p.nombre}" <${p.email}>` : p?.email || undefined);

    const mensaje = {
        from: fmt({ nombre: 'JN Logística', email: dataservidor.user }),
        to: fmt(dataemail.destinatario),
        cc: fmt(dataemail.copia),
        subject: dataemail.asunto || '(sin asunto)',
        // súper simple: si viene html lo mandás tal cual, si no lo envuelvo en <p>
        html: /<\/?[a-z][\s\S]*>/i.test(dataemail.cuerpo || '')
            ? dataemail.cuerpo
            : `<p>${(dataemail.cuerpo || '').replace(/\n/g, '<br>')}</p>`,
        text: (dataemail.cuerpo || '').replace(/<[^>]*>/g, ''),
    };

    try {
        await transporter.sendMail(mensaje);

        if (idlinea != -1) {
            const query = 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?';
            await executeQuery(connection, query, [idlinea], true);
        }

        return { status: true, message: 'Email enviado y registro actualizado' };
    } catch (e) {
        // ERROR: podés reusar el mismo nombre de variable "query" dentro del catch (otro scope)
        if (idlinea != -1) {
            const query = 'UPDATE envios_historial SET notificado = NOW(), estado = "ERROR", estado_error = ? WHERE id = ?';
            await executeQuery(connection, query, [String(e.message).slice(0, 1024), idlinea], true);
        }

        return { ok: false, error: e.message };
    }
}

module.exports = { notificarEnvio };
