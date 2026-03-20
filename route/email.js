// routes/email.js
const express = require("express");
const router = express.Router();
const { getConnection, getnombre } = require("../dbconfig");
const { notificarEnvio } = require("../controller/email");
const { loadSmtpFromDB } = require("../lib/loadSmtpFromDB");

// POST /api/notificarMail
router.post("/notificarMail", async (req, res) => {
    const { idempresa, idlinea, dataemail } = req.body || {};

    // Validaciones mínimas del payload (lado API)
    if (!idempresa) {
        return res.status(400).json({ ok: false, error: "Falta idempresa" });
    }
    if (!dataemail?.destinatario?.email) {
        return res.status(400).json({ ok: false, error: "Falta dataemail.destinatario.email" });
    }

    const connection = await getConnection(idempresa);

    try {
        // Importante: NO usamos dataservidor del body. Se obtiene de la DB + cache interna.
        const result = await notificarEnvio({ idempresa, idlinea, dataemail }, connection);
        res.status(200).json(result);
    } catch (error) {
        console.error("notificarMail error:", error);
        res.status(500).json({ ok: false, error: error.message || String(error) });
    } finally {
        connection.end();
    }
});

router.post("/notificarMailPrueba", async (req, res) => {
    const { idempresa } = req.body || {};

    if (!idempresa) {
        return res.status(400).json({ ok: false, error: "Falta idempresa" });
    }

    let connection;

    try {
        connection = await getConnection(idempresa);

        const smtp = await loadSmtpFromDB(connection);
        const nombre = await getnombre(idempresa);

        const destino = "agustintracheskyoficial@gmail.com";
        const puertos = [];

        //  if (smtp.port || smtp.puerto) puertos.push(Number(smtp.puerto ?? smtp.port));
        if (!puertos.includes(465)) puertos.push(465);
        if (!puertos.includes(587)) puertos.push(587);
        if (!puertos.includes(2525)) puertos.push(2525);

        let lastError = null;

        for (const port of puertos) {
            const secure = port === 465;

            const cfg = {
                host: "14000088.ferozo.com",
                port: 465,
                secure,
                auth: {
                    user: "tupedido@tornuslogistica.com.ar",
                    pass: "SendEnv999*",
                },
                tls: {
                    minVersion: "TLSv1.2",
                    servername: "14000088.ferozo.com",
                    rejectUnauthorized: false,
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
                family: 4,
            };

            try {
                console.log("SMTP TRY", {
                    host: cfg.host,
                    port: cfg.port,
                    secure: cfg.secure,
                    user: cfg.auth.user,
                    to: destino,
                    cc: destino,
                });

                const transporter = nodemailer.createTransport(cfg);

                const info = await transporter.sendMail({
                    from: `"${nombre || "Prueba SMTP"}" <${smtp.user}>`,
                    to: destino,
                    cc: destino,
                    subject: `Prueba SMTP empresa ${idempresa} puerto ${port}`,
                    text: "hola",
                    html: "<p>hola</p>",
                });

                return res.status(200).json({
                    ok: true,
                    message: "Mail de prueba enviado",
                    host: "14000088.ferozo.com",
                    port,
                    secure,
                    messageId: info.messageId,
                    accepted: info.accepted,
                    rejected: info.rejected,
                    response: info.response,
                });
            } catch (err) {
                lastError = {
                    port,
                    code: err?.code,
                    command: err?.command,
                    responseCode: err?.responseCode,
                    message: err?.message,
                };

                console.error("SMTP FAIL", lastError);
            }
        }

        return res.status(500).json({
            ok: false,
            error: "No se pudo enviar por ningun puerto",
            detail: lastError,
        });
    } catch (error) {
        console.error("notificarMailPrueba error:", error);
        return res.status(500).json({
            ok: false,
            error: error.message || String(error),
        });
    } finally {
        if (connection) connection.end();
    }
});

module.exports = router;
