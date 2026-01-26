const nodemailer = require("nodemailer");

async function main() {
    const transporter = nodemailer.createTransport({
        host: "kv1.toservers.com",
        port: 587,
        secure: false, // STARTTLS
        auth: { user: "info@yaenvios.com.ar", pass: "info202020@" },
        requireTLS: true,
        tls: { minVersion: "TLSv1.2", servername: "kv1.toservers.com" },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
    });

    const info = await transporter.sendMail({
        from: '"YaEnvios" <info@yaenvios.com.ar>',
        to: "christian.marassi@gmail.com",
        subject: "Prueba de envío",
        text: "Hola Christian, prueba SMTP 587 desde Node.",
        html: "<p>Hola Christian, prueba <b>SMTP 587</b> desde Node.</p>",
    });

    console.log("Enviado OK. MessageId:", info.messageId);
}

main().catch((err) => {
    console.error("ERROR enviando mail:", err);
    process.exit(1);
});
