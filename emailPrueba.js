const express = require("express");
const nodemailer = require("nodemailer");
const mysql = require('mysql');
const redis = require('redis');


const app = express();
app.use(express.json());
//configuraciones redis port para correrlo 
const PORT = 13069;
const redisClient = redis.createClient({
    socket: {
        host: '192.99.190.137',
        port: 50301,
    },
    password: 'sdJmdxXC8luknTrqmHceJS48NTyzExQg',
});
redisClient.on('reconnecting', () => console.log('Redis: reintentando...'));
redisClient.on('connect', () => console.log('Redis: TCP conectado'));
redisClient.on('ready', () => console.log('Redis: ready'));
redisClient.on('end', () => console.log('Redis: conexión cerrada'));

redisClient.on('error', (err) => {
    console.error('Error al conectar con Redis:', err);
});

(async () => {
    await redisClient.connect();
    console.log('Redis conectado');
})();
let companiesList = {};

//funciones para conectarme a la bd y cosas necesarias
async function getConnection(idempresa) {
    try {
        //     console.log("idempresa recibido:", idempresa);

        // Validación del tipo de idempresa
        if (typeof idempresa !== 'string' && typeof idempresa !== 'number') {
            throw new Error(`idempresa debe ser un string o un número, pero es: ${typeof idempresa}`);
        }

        // Obtener las empresas desde Redis
        const redisKey = 'empresasData';
        const empresasData = await getFromRedis(redisKey);
        if (!empresasData) {
            throw new Error(`No se encontraron datos de empresas en Redis.`);
        }

        // console.log("Datos obtenidos desde Redis:", empresasData);

        // Buscar la empresa por su id
        const empresa = empresasData[String(idempresa)];
        if (!empresa) {
            throw new Error(`No se encontró la configuración de la empresa con ID: ${idempresa}`);
        }

        //    console.log("Configuración de la empresa encontrada:", empresa);

        // Configurar la conexión a la base de datos
        const config = {
            host: 'bhsmysql1.lightdata.com.ar',  // Host fijo
            database: empresa.dbname,           // Base de datos desde Redis
            user: empresa.dbuser,               // Usuario desde Redis
            password: empresa.dbpass,           // Contraseña desde Redis
        };
        /*  const config = {
              host: 'localhost',  // Host fijo
              database: "logisticaa",           // Base de datos desde Redis
              user: "logisticaA",               // Usuario desde Redis
              password: "logisticaa",           // Contraseña desde Redis
          };*/

        console.log("Configuración de la conexión:", config);

        return mysql.createConnection(config);
    } catch (error) {
        console.error(`Error al obtener la conexión:`, error.message);

        // Lanza un error con una respuesta estándar
        throw {
            status: 500,
            response: {
                estado: false,

                error: -1,

            },
        };
    }
}
async function getnombre(idempresa) {
    try {
        //     console.log("idempresa recibido:", idempresa);

        // Validación del tipo de idempresa
        if (typeof idempresa !== 'string' && typeof idempresa !== 'number') {
            throw new Error(`idempresa debe ser un string o un número, pero es: ${typeof idempresa}`);
        }

        // Obtener las empresas desde Redis
        const redisKey = 'empresasData';
        const empresasData = await getFromRedis(redisKey);
        if (!empresasData) {
            throw new Error(`No se encontraron datos de empresas en Redis.`);
        }

        // console.log("Datos obtenidos desde Redis:", empresasData);

        // Buscar la empresa por su id
        const empresa = empresasData[String(idempresa)];
        if (!empresa) {
            throw new Error(`No se encontró la configuración de la empresa con ID: ${idempresa}`);
        }

        //    console.log("Configuración de la empresa encontrada:", empresa);



        return empresa.empresa;
    } catch (error) {
        console.error(`Error al obtener la conexión:`, error.message);

        // Lanza un error con una respuesta estándar
        throw {
            status: 500,
            response: {
                estado: false,

                error: -1,

            },
        };
    }
}
async function getFromRedis(key) {
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        console.error(`Error obteniendo clave ${key} de Redis:`, error);
        throw {
            status: 500,
            response: {
                estado: false,

                error: -1

            },
        };
    }
}
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
async function executeQuery(connection, query, values, log = false) {
    if (log) {
        console.log(`Ejecutando query: ${query} con valores: ${values}`);
    }
    try {
        return new Promise((resolve, reject) => {
            connection.query(query, values, (err, results) => {
                if (err) {
                    if (log) {
                        console.log(`Error en executeQuery: ${err.message}`);
                    }
                    reject(err);
                } else {
                    if (log) {
                        console.log(`Query ejecutado con éxito: ${JSON.stringify(results)}`);
                    }
                    resolve(results);
                }
            });
        });
    } catch (error) {
        log(`Error en executeQuery: ${error.message}`);
        throw error;
    }
}

// =====================================
// ROUTE PRUEBA SMTP
// =====================================
app.post("/notificarMailPrueba", async (req, res) => {
    const idempresa = 350

    if (!idempresa) {
        return res.status(400).json({
            ok: false,
            error: "Falta idempresa",
        });
    }

    let connection;

    try {
        connection = await getConnection(idempresa);



        const smtp = await loadSmtpFromDB(connection);
        const nombre = await getnombre(idempresa);

        console.log("SMTP DEBUG", {
            host: smtp.host,
            port: smtp.port || smtp.puerto,
            user: smtp.user,
            secure: smtp.secure,
        });

        const destino = "agustintracheskyoficial@gmail.com";
        const puertos = [];

        if (smtp.port || smtp.puerto) puertos.push(Number(smtp.puerto ?? smtp.port));
        if (!puertos.includes(465)) puertos.push(465);
        if (!puertos.includes(587)) puertos.push(587);
        if (!puertos.includes(2525)) puertos.push(2525);

        let lastError = null;

        for (const port of puertos) {
            const secure = port === 465;

            const cfg = {
                host: smtp.host,
                port,
                secure,
                auth: {
                    user: smtp.user,
                    pass: smtp.pass,
                },
                tls: {
                    minVersion: "TLSv1.2",
                    servername: smtp.host,
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

                console.log("SMTP OK", {
                    port,
                    messageId: info?.messageId,
                    accepted: info?.accepted,
                    rejected: info?.rejected,
                    response: info?.response,
                });

                return res.status(200).json({
                    ok: true,
                    message: "Mail de prueba enviado",
                    host: cfg.host,
                    port,
                    secure,
                    messageId: info.messageId,
                    accepted: info.accepted,
                    rejected: info.rejected,
                    response: info.response,
                });
            } catch (err) {
                lastError = {
                    triedPort: port,
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
        try {
            if (connection) await connection.end();
        } catch (e) {
            console.error("Error cerrando conexión:", e.message);
        }
    }
});

// =====================================
// SERVER
// =====================================
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
});