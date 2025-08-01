import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signPDFFromFilesExplorer.html'));
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});