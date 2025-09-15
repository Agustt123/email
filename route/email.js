
const express = require("express");
const router = express.Router();
const { redisClient, getConnection, getCompanyById } = require("../dbconfig");
const { notificarEnvio } = require("../controller/email");
router.post("/notificarMail", async (req, res) => {
    const data = req.body;
    const connection = await getConnection(data.idempresa);



    try {
        const result = await notificarEnvio(data, connection);
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.end();
    }
});

module.exports = router;