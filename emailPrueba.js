const express = require("express");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const PORT = 13069;

const SMTP_CONFIG = {
    host: "l4000088.ferozo.com",
    port: 465,
    secure: true,
    auth: {
        user: "tupedido@tornuslogistica.com.ar",
        pass: "SendEnv999*",
    },
    tls: {
        minVersion: "TLSv1.2",
        servername: "l4000088.ferozo.com",
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
};

const DESTINO_DEFAULT = "agustintracheskyoficial@gmail.com";

async function enviarMailPrueba(destino) {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    await transporter.verify();

    return transporter.sendMail({
        from: '"Tornus Logistica Prueba" <tupedido@tornuslogistica.com.ar>',
        to: destino,
        subject: "Prueba SMTP Tornus Logistica",
        text: "Este es un correo de prueba enviado desde emailPrueba.js",
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.5;">
                <h2>Prueba SMTP OK</h2>
                <p>Este es un correo de prueba enviado desde <b>emailPrueba.js</b>.</p>
                <p>Servidor: l4000088.ferozo.com</p>
                <p>Puerto: 465 SSL</p>
            </div>
        `,
    });
}

app.post("/notificarMailPrueba", async (req, res) => {
    const destino = req.body?.destino || DESTINO_DEFAULT;

    try {
        const info = await enviarMailPrueba(destino);

        console.log("SMTP OK", {
            host: SMTP_CONFIG.host,
            port: SMTP_CONFIG.port,
            secure: SMTP_CONFIG.secure,
            to: destino,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
        });

        return res.status(200).json({
            ok: true,
            message: "Mail de prueba enviado",
            to: destino,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
        });
    } catch (error) {
        console.error("SMTP FAIL", {
            code: error?.code,
            command: error?.command,
            responseCode: error?.responseCode,
            message: error?.message,
        });

        return res.status(500).json({
            ok: false,
            error: error?.message || String(error),
            code: error?.code || null,
            responseCode: error?.responseCode || null,
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de prueba escuchando en puerto ${PORT}`);
    console.log(`POST http://localhost:${PORT}/notificarMailPrueba`);
});
