// lib/buildTransporterConfig.js
function buildTransporterConfig(ds) {
    const host = ds.host;
    const port = Number(ds.puerto ?? ds.port);

    // Puertos típicos NO SMTP (evitar “Greeting never received”)
    const nonSmtpPorts = new Set([110, 143, 993, 995]);
    if (nonSmtpPorts.has(port)) {
        throw new Error(
            `Puerto ${port} no es SMTP (parece POP/IMAP). Usá 587 (STARTTLS) o 465 (SMTPS).`
        );
    }

    // secure=true solo para SMTPS (465). Para 587/25/2525 -> STARTTLS (secure=false)
    const secure =
        ds.secure === true ||
        String(ds.secure ?? "").toLowerCase() === "true" ||
        port === 465;

    const config = {
        host,
        port,
        secure,
        auth: ds.user && ds.pass ? { user: ds.user, pass: ds.pass } : undefined,

        // STARTTLS cuando secure=false
        requireTLS: !secure,
        tls: {
            minVersion: "TLSv1.2",
            servername: host,
        },

        connectionTimeout: 15000,
        greetingTimeout: 20000, // un poco más tolerante
    };

    // Si es SMTPS (465), requireTLS no hace falta y a veces molesta
    if (secure) {
        delete config.requireTLS;
    }

    return config;
}

module.exports = { buildTransporterConfig };
