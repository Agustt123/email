// lib/buildTransporterConfig.js
function normalizeSmtpPort(port) {
    // puertos típicos de recepción -> mapear a smtp
    if (port === 995 || port === 110 || port === 993 || port === 143) return 587;
    return port;
}

function buildTransporterConfig(ds) {
    const host = ds.host;
    let port = Number(ds.puerto ?? ds.port);
    port = normalizeSmtpPort(port);

    const secure =
        ds.secure === true ||
        String(ds.secure ?? "").toLowerCase() === "true" ||
        port === 465;

    const config = {
        host,
        port,
        secure,
        auth: ds.user && ds.pass ? { user: ds.user, pass: ds.pass } : undefined,
        requireTLS: !secure,
        tls: { minVersion: "TLSv1.2", servername: host },
        connectionTimeout: 15000,
        greetingTimeout: 20000,
    };

    if (secure) delete config.requireTLS;
    return config;
}

module.exports = { buildTransporterConfig };
