const nodemailer = require("nodemailer");

const config = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "zetallegue@gmail.com",
    pass: "zetallegue1234",
  },
  logger: true,
  debug: true,
};

const transporter = nodemailer.createTransport(config);

const mailOptions = {
  from: '"Prueba Gmail Debug SSL" <zetallegue@gmail.com>',
  to: "agustintracheskyoficial@gmail.com",
  subject: "Prueba debug Gmail 465",
  text: "Hola, este es un envio de prueba con SSL.",
};

async function probarSMTP() {
  try {
    console.log("Verificando conexion SMTP SSL...");
    await transporter.verify();
    console.log("Conexion SMTP SSL verificada correctamente.");
  } catch (error) {
    console.error("Fallo la verificacion SMTP SSL:", error.message);

    if (error.code) {
      console.error("Codigo:", error.code);
    }

    if (error.response) {
      console.error("Respuesta SMTP:", error.response);
    }

    return;
  }

  try {
    console.log("Enviando email de prueba SSL...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado correctamente.");
    console.log("Message ID:", info.messageId);
    console.log("Respuesta del servidor:", info.response);
  } catch (error) {
    console.error("Error al enviar el email SSL:", error.message);

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
