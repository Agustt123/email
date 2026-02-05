// controller/email.js
const nodemailer = require('nodemailer');
const { executeQuery, getnombre } = require('../dbconfig');
const { getCachedSmtp, setCachedSmtp, invalidateSmtp } = require('../lib/smtpCache');
const { loadSmtpFromDB } = require('../lib/loadSmtpFromDB');
const { buildTransporterConfig } = require('../lib/buildTransporterConfig');
const { renderTemplate } = require('../lib/renderTemplate');

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
  let mensaje;
  // 2) Preparar mensaje
  if (dataemail.html_content) {

    mensaje = {
      from: fmt({ nombre: nombre, email: dataservidor.user || 'no-reply@localhost' }),
      to: fmt(dataemail.destinatario),
      cc: fmt(dataemail.copia),
      subject: dataemail.asunto || 'Tu pedido fue despachado 🚚',
      html,
      text: toText(dataemail.html_content),
    };

  }
  if (dataemail.html == true && dataemail.idempresa == 217 && dataemail.html_content == null && dataemail.html_content == undefined && dataemail.html_content == false) {
    console.log("enrtrerer");


    const html = renderTemplate('envio_despachado.html', {
      recipient_name: dataemail?.destinatario?.nombre || 'Cliente',
      seller_name: nombre,
      order_number: dataemail?.pedido || '—',
      tracking_url: dataemail?.tracking_url || '#',
      carrier_name: 'YA Envíos',
      tracking_number: dataemail?.tracking_number || '—',
      recipient_address: dataemail?.direccion || '',
      shipped_date: dataemail?.shipped_date || '',
      in_transit_date: dataemail?.in_transit_date || '',
      support_email: 'contacto@yaenvios.com.ar',
      preferences_url: '#',
      privacy_url: '#',
    });
    // 2) Preparar mensaje
    mensaje = {
      from: fmt({ nombre: nombre, email: dataservidor.user || 'no-reply@localhost' }),
      to: fmt(dataemail.destinatario),
      cc: fmt(dataemail.copia),
      subject: dataemail.asunto || 'Tu pedido fue despachado 🚚',
      html,
      text: toText(html),
    };
  }

  else {
    mensaje = {
      from: fmt({ nombre: nombre, email: dataservidor.user || 'no-reply@localhost' }),
      to: fmt(dataemail.destinatario),
      cc: fmt(dataemail.copia),
      subject: dataemail.asunto || '(sin asunto)',
      html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de envío </title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { border-collapse:collapse !important; }
    body {
      margin:0; padding:0; width:100%!important; height:100%!important;
      font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color:#edf2f7; color:#333333;
    }
    a { text-decoration:none; color:#2b6cb0; }
    img { border:0; outline:none; text-decoration:none; display:block; max-width:100%; height:auto; }
    @media screen and (max-width:600px) {
      .container { width:100%!important; padding:20px!important; }
      .btn { width:100%!important; }
    }
  </style>
</head>
<body style="margin:0; padding:0;">
  <table width="100%" bgcolor="#edf2f7" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" class="container" bgcolor="#ffffff" cellpadding="0" cellspacing="0" style="margin-top:40px; margin-bottom:40px; border-radius:6px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:30px 20px 10px;">

            </td>
          </tr>
          <tr>
            <td align="center" style="padding:10px 30px;">
              <p style="font-size:15px; line-height:22px; margin:10px 0 0;">${dataemail?.cuerpo || ''}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:30px 30px 0;">
              <p style="font-size:14px; color:#555;">Ante cualquier duda, contactanos.</p>
              <p style="font-size:14px; color:#555;">¡Gracias!<p>
            </td>
          </tr>
          <tr>
          </tr>
          <tr>
            <td align="center" style="padding:10px 30px 30px;">
              <a href="#" style="font-size:12px; color:#a0aec0;">No recibir más notificaciones sobre este envío</a>
            </td>
          </tr>
        </table>
        <p style="font-size:11px; color:#a0aec0; text-align:center;">© 2025. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `,
      text: toText(dataemail.cuerpo || ''),
    };
  }


  // Función interna para enviar con una config dada
  async function trySend(ds) {
    const portsToTry = [];

    // 1) primero el puerto que venga en ds
    if (ds.port || ds.puerto) portsToTry.push(Number(ds.puerto ?? ds.port));

    // 2) fallback típico
    if (!portsToTry.includes(587)) portsToTry.push(587);
    if (!portsToTry.includes(465)) portsToTry.push(465);

    let lastErr;

    for (const p of portsToTry) {
      try {
        const attempt = { ...ds, port: p, puerto: p };
        const cfg = buildTransporterConfig(attempt);

        const transporter = nodemailer.createTransport(cfg);

        // verify ayuda a fallar rápido si no hay saludo/auth
        await transporter.verify();

        return await transporter.sendMail(mensaje);
      } catch (err) {
        lastErr = err;

        const code = String(err?.code || "");
        const msg = String(err?.message || "");

        const retryable =
          code === "ETIMEDOUT" ||
          code === "ECONNRESET" ||
          code === "ESOCKET" ||
          msg.includes("Greeting never received") ||
          msg.includes("CONN");

        // si no es retryable (ej: auth), cortamos
        if (!retryable) break;
      }
    }

    throw lastErr;
  }

  try {
    // 3) Primer intento con cache/DB
    const info = await trySend(dataservidor);

    if (!onlySend) {
      //await executeQuery(connection, 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?', [idlinea], log);
      await executeQuery(connection, 'UPDATE envios_historial SET email_notificado_fecha = now(), email_notificado_sync = 3 WHERE id =  ?', [idlinea], log);

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
          //  await executeQuery(connection, 'UPDATE envios_historial SET notificado = NOW() WHERE id = ?', [idlinea], log);
          await executeQuery(connection, 'UPDATE envios_historial SET email_notificado_fecha = now(), email_notificado_sync = 3 WHERE id =  ?', [idlinea], log);
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
