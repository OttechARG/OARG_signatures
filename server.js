import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '10mb' })); // para base64 y JSON
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/firmar-pdf', upload.single('pdf'), async (req, res) => {
  try {
    // Datos del body
    const firmaBase64 = req.body.firma; // "data:image/png;base64,..."
    const canvasWidth = Number(req.body.canvasWidth);
    const canvasHeight = Number(req.body.canvasHeight);

    if (!firmaBase64 || !canvasWidth || !canvasHeight) {
      return res.status(400).send('Faltan datos de firma o tamaño canvas');
    }

    // PDF original
    const pdfBytes = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Embed de la firma PNG
    const firmaBytes = Buffer.from(firmaBase64.split(',')[1], 'base64');
    const firmaImage = await pdfDoc.embedPng(firmaBytes);

    // Página 1 y su tamaño
    const page = pdfDoc.getPages()[0];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Escalar la firma para que el canvas (600x800 o lo que sea) se ajuste al PDF proporcionalmente
    const scaleX = pdfWidth / canvasWidth;
    const scaleY = pdfHeight / canvasHeight;
    const scale = Math.min(scaleX, scaleY);

    const firmaWidth = canvasWidth * scale;
    const firmaHeight = canvasHeight * scale;

    // Dibujar la firma arriba (recordá que el origen es abajo-izquierda)
    page.drawImage(firmaImage, {
      x: 0,
      y: pdfHeight - firmaHeight,
      width: firmaWidth,
      height: firmaHeight,
    });

    // Guardar PDF firmado
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