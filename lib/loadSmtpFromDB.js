// lib/loadSmtpFromDB.js
const { executeQuery } = require('../dbconfig');

async function loadSmtpFromDB(connection) {
    const rows = await executeQuery(
        connection,
        `SELECT host, port, user, pass
       FROM mensajes_email
      WHERE superado = 0 AND elim = 0
      ORDER BY id ASC
      LIMIT 1`
    );

    if (!rows?.length) {
        throw new Error('No hay configuración SMTP activa (mensajes_email).');
    }

    const { host, port, user, pass } = rows[0];
    if (!host || !port) {
        throw new Error('Config SMTP incompleta en mensajes_email (falta host/port).');
    }

    return { host, puerto: Number(port), user, pass };
}

module.exports = { loadSmtpFromDB };
