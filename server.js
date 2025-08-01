import express from 'express';
import multer from 'multer';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' })); // para base64 grande

const upload = multer({ dest: 'uploads/' });

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

  // Cleanup temp PDF
  fs.unlinkSync(pdfPath);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=firmado.pdf');
  res.send(pdfBytes);
});

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});