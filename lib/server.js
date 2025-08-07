import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import fetch from 'node-fetch'; // Necesitás instalar esto con `npm i node-fetch`
const app = express();
const PORT = 3000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Multer setup
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir))
            fs.mkdirSync(uploadsDir);
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });
// Middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
// Static folders
app.use(express.static(path.join(__dirname, '../public')));
app.use('/lib', express.static(path.join(__dirname, '../lib')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// Rutas
app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'signMain.html'));
});
app.post('/subir', upload.single('archivo'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: 'No se subió archivo' });
    const urlFirma = `http://localhost:${PORT}/firmar/${req.file.filename}`;
    res.json({ url: urlFirma });
});
app.get('/firmar/:archivo', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'signPDFFromHTTP.html'));
});
// Proxy a servidor externo
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
app.post('/proxy/xtrem-api', async (req, res) => {
    try {
        const body = req.body;
        const response = await fetch('https://131.0.232.130:8443/xtrem/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('admin:S@geX3_R0cks').toString('base64'),
            },
            body: JSON.stringify(body),
            agent: httpsAgent,
        });
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error('Error en proxy:', error);
        res.status(500).json({ error: 'Error en proxy al llamar al servidor externo' });
    }
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
