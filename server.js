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

app.post('/firmar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    const firmaBase64 = req.body.firma; // base64 "data:image/png;base64,..."
    const canvasWidth = Number(req.body.canvasWidth);
    const canvasHeight = Number(req.body.canvasHeight);
    const firmaPosXCanvas = Number(req.body.firmaPosX);
    const firmaPosYCanvas = Number(req.body.firmaPosY);
    const firmaBoxWidthCanvas = Number(req.body.firmaBoxWidth);
    const firmaBoxHeightCanvas = Number(req.body.firmaBoxHeight);

    if (!firmaBase64 || !canvasWidth || !canvasHeight) {
      return res.status(400).send('Faltan datos de firma o tamaño canvas');
    }

    const pdfBytes = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    const firmaBytes = Buffer.from(firmaBase64.split(',')[1], 'base64');
    const firmaImage = await pdfDoc.embedPng(firmaBytes);

    const page = pdfDoc.getPages()[0];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Escalas entre canvas y PDF
    const scaleX = pdfWidth / canvasWidth;
    const scaleY = pdfHeight / canvasHeight;

    // Convertir posición y tamaño de la firma de canvas a PDF
    const firmaPosXPDF = firmaPosXCanvas * scaleX;
    // Nota: pdf-lib tiene origen abajo-izquierda, canvas arriba-izquierda, por eso invertimos eje Y
    const firmaPosYPDF = pdfHeight - (firmaPosYCanvas + firmaBoxHeightCanvas) * scaleY;

    const firmaWidthPDF = firmaBoxWidthCanvas * scaleX;
    const firmaHeightPDF = firmaBoxHeightCanvas * scaleY;

    // Dibujar la firma en la posición correcta
    page.drawImage(firmaImage, {
      x: firmaPosXPDF,
      y: firmaPosYPDF,
      width: firmaWidthPDF,
      height: firmaHeightPDF,
    });

    const pdfFinal = await pdfDoc.save();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=factura_firmada.pdf',
    });

    res.send(Buffer.from(pdfFinal));
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al firmar el PDF');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prueba.html'));
});

app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});