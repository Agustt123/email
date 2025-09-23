// lib/buildTransporterConfig.js
function buildTransporterConfig(ds) {
    const port = Number(ds.puerto || ds.port);
    const secure =
        ds.secure === true ||
        String(ds.secure ?? '').toLowerCase() === 'true' ||
        port === 465;

    return {
        host: ds.host,
        port,
        secure,                       // 465 => true (SMTPS), 587/25 => false (STARTTLS)
        auth: (ds.user && ds.pass) ? { user: ds.user, pass: ds.pass } : undefined,
        requireTLS: !secure,          // STARTTLS solo cuando NO es SMTPS
        tls: !secure ? { minVersion: 'TLSv1.2', servername: ds.host } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        // logger: true, debug: true, // activar en dev si necesitás ver el handshake
    };
}

module.exports = { buildTransporterConfig };
