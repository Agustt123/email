// Requiere: npm install nodemailer
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "l4000088.ferozo.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: "tupedido@tornuslogistica.com.ar",
    pass: "SendEnv999*",
  },
});

const mailOptions = {
  from: '"Tu Pedido - Tornus Logística" <coordinacion@tornuslogistica.com.ar>',
  to: "christian.marassi@gmail.com",
  subject: "Email de prueba",
  text: "Este es un email de prueba enviado desde Node.js con Nodemailer.",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>✅ Email de prueba</h2>
      <p>Este es un email de prueba enviado desde <strong>Node.js</strong> usando Nodemailer.</p>
      <p>Configuración utilizada:</p>
      <ul>
        <li>Servidor: smtp.gmail.com</li>
        <li>Puerto: 465 (SSL)</li>
        <li>Remitente: coordinacion@tornuslogistica.com.ar</li>
      </ul>
      <hr />
      <small style="color: gray;">Tornus Logística</small>
    </div>
  `,
};

async function enviarEmail() {
  try {
    console.log("Enviando email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email enviado correctamente.");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Error al enviar el email:", error);
  }
}

enviarEmail();