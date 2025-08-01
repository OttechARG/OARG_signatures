import express from 'express';
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
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// Guardar en 'uploads-pdfs/' en lugar de 'uploads/'
const upload = multer({ dest: uploadDir });

app.post('/firmar', upload.single('pdf'), async (req, res) => {
  const firmaBase64 = req.body.firma;
  const firmaBytes = Buffer.from(firmaBase64.split(',')[1], 'base64');
  const pdfPath = req.file.path;

  const existingPdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const firmaImg = await pdfDoc.embedPng(firmaBytes);
  const { width, height } = firmaImg.scale(0.5);

  firstPage.drawImage(firmaImg, {
    x: 50,
    y: 100,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();

  // Opcional: borrar el archivo temporal después de procesarlo
  fs.unlinkSync(pdfPath);

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

  // Ya está guardado en uploads-pdfs, no hace falta renombrar ni mover
  console.log(`Archivo subido a: ${archivo.path} (cliente: ${cliente})`);

  res.send('Factura cargada correctamente');
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});