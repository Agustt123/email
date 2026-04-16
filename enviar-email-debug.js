const nodemailer = require("nodemailer");

const config = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "zetallegue@gmail.com",
    pass: "zetallegue1234",
  },
  logger: true,
  debug: true,
};

const transporter = nodemailer.createTransport(config);

const mailOptions = {
  from: '"Prueba Gmail Debug" <zetallegue@gmail.com>',
  to: "agustintracheskyoficial@gmail.com",
  subject: "Prueba debug Gmail",
  text: "Hola, este es un envio de prueba con debug.",
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Prueba debug Gmail</h2>
      <p>Hola, este es un envio de prueba con debug.</p>
      <p>Host: smtp.gmail.com</p>
      <p>Puerto: 587</p>
      <p>Seguridad: STARTTLS</p>
    </div>
  `,
};

async function probarSMTP() {
  try {
    console.log("Verificando conexion SMTP...");
    await transporter.verify();
    console.log("Conexion SMTP verificada correctamente.");
  } catch (error) {
    console.error("Fallo la verificacion SMTP:", error.message);

    if (error.code) {
      console.error("Codigo:", error.code);
    }

    if (error.response) {
      console.error("Respuesta SMTP:", error.response);
    }

    return;
  }

  try {
    console.log("Enviando email de prueba...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado correctamente.");
    console.log("Message ID:", info.messageId);
    console.log("Respuesta del servidor:", info.response);
  } catch (error) {
    console.error("Error al enviar el email:", error.message);

    if (error.code) {
      console.error("Codigo:", error.code);
    }

    if (error.command) {
      console.error("Comando SMTP:", error.command);
    }

    if (error.response) {
      console.error("Respuesta SMTP:", error.response);
    }
  }
}

probarSMTP();
