const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "zetallegue@gmail.com",
    pass: "zetallegue1234",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const mailOptions = {
  from: '"Prueba Gmail" <zetallegue@gmail.com>',
  to: "agustintracheskyoficial@gmail.com",
  subject: "Prueba 2",
  text: "Hola",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Prueba 2</h2>
      <p>Hola</p>
      <hr />
      <small>Enviado con Gmail SMTP</small>
    </div>
  `,
};

async function enviarEmail() {
  try {
    console.log("Enviando email de prueba con Gmail...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado correctamente.");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("Error al enviar el email:", error.message);

    if (error.response) {
      console.error("Respuesta SMTP:", error.response);
    }
  }
}

enviarEmail();
