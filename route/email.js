// routes/email.js
const express = require("express");
const router = express.Router();
const { getConnection } = require("../dbconfig");
const { notificarEnvio } = require("../controller/email");

// POST /api/notificarMail
router.post("/notificarMail", async (req, res) => {
    const { idempresa, idlinea, dataemail } = req.body || {};

    // Validaciones mínimas del payload (lado API)
    if (!idempresa) {
        return res.status(400).json({ ok: false, error: "Falta idempresa" });
    }
    if (!dataemail?.destinatario?.email) {
        return res.status(400).json({ ok: false, error: "Falta dataemail.destinatario.email" });
    }

    const connection = await getConnection(idempresa);
    try {
        // Importante: NO usamos dataservidor del body. Se obtiene de la DB + cache interna.
        const result = await notificarEnvio({ idempresa, idlinea, dataemail }, connection);
        res.status(200).json(result);
    } catch (error) {
        console.error("notificarMail error:", error);
        res.status(500).json({ ok: false, error: error.message || String(error) });
    } finally {
        connection.end();
    }
});

module.exports = router;
