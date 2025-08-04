/*import express from 'express';
import multer from 'multer'; 
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Asegurarse de que el directorio de subida exista
const uploadDir = path.join(__dirname, 'uploads-pdfs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(express.static('public'));
app.use('/uploads-pdfs', express.static(uploadDir));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// Guardar en 'uploads-pdfs/' en lugar de 'uploads/'
const upload = multer({ dest: uploadDir });

app.post('/firmar', async (req, res) => {
  const { firma, filename } = req.body;

  const pdfPath = path.join(uploadDir, filename);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).send('PDF no encontrado');
  }

  const firmaBytes = Buffer.from(firma.split(',')[1], 'base64');
  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const firmaImg = await pdfDoc.embedPng(firmaBytes);
  const { width, height } = firmaImg.scale(0.5);

  firstPage.drawImage(firmaImg, { x: 50, y: 100, width, height });

  const pdfBytes = await pdfDoc.save();
  fs.unlinkSync(pdfPath); // opcional

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=firmado.pdf');
  res.send(pdfBytes);
});

app.post('/cargar-factura', upload.single('archivo'), (req, res) => {
  const archivo = req.file;
  const cliente = req.body.nombreCliente;

  if (!archivo) {
    return res.status(400).send('No se subió ningún archivo');
  }

  const nombreArchivo = path.basename(archivo.path);
  const urlFirma = `http://localhost:${port}/firmar/${nombreArchivo}`;

  res.send(`Factura cargada correctamente. Link para firmar: <a href="${urlFirma}">${urlFirma}</a>`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signFromLocalFiles.html'));
});
app.get('/firmar/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Archivo no encontrado');
  }

  // Enviá tu HTML de firma personalizado
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});*/