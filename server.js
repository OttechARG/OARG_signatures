import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Multer para guardar archivos en disco (carpeta uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Sirve el visor y archivos públicos
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint raíz, solo para test o info básica (puede cambiar)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signPDFFromFilesExplorer.html'));
});

// Endpoint para subir PDF, recibe 'archivo' en form-data
app.post('/subir', upload.single('archivo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
  const urlFirma = `http://localhost:${PORT}/firmar/${req.file.filename}`;
  res.json({ url: urlFirma });
});

// Ruta para mostrar visor para firmar
app.get('/firmar/:archivo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signPDFFromHTTP.html'));
});

// Servir archivos PDF subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});