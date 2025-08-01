pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.9.179/build/pdf.worker.min.js';

const pdfInput = document.getElementById('pdfInput');
const pdfCanvas = document.getElementById('pdfCanvas');
const sigCanvas = document.getElementById('sigCanvas');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

const pdfCtx = pdfCanvas.getContext('2d');

// Ajustamos tamaño real de canvas (se hace luego de cargar PDF)
function ajustarTamañoCanvas(width, height) {
  pdfCanvas.width = width;
  pdfCanvas.height = height;
  sigCanvas.width = width;
  sigCanvas.height = height;

  // CSS para que canvas se ajusten al contenedor visual
  pdfCanvas.style.width = width + 'px';
  pdfCanvas.style.height = height + 'px';
  sigCanvas.style.width = width + 'px';
  sigCanvas.style.height = height + 'px';
  // ¡ESTO ES CLAVE! ajustamos el wrapper
  document.getElementById('canvasWrapper').classList.add('visible');
  document.getElementById('buttonsWrapper').style.display = 'block';
  canvasWrapper.style.width = width + 'px';
  canvasWrapper.style.height = height + 'px';
}

let signaturePad;

// Inicializar SignaturePad una vez con el canvas de firma
function initSignaturePad() {
  if (signaturePad) signaturePad.off(); // Por si ya existía
  signaturePad = new SignaturePad(sigCanvas, {
    backgroundColor: 'transparent',
    penColor: 'black',
  });
}

pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;

  // Por simplicidad solo mostramos la página 1
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });

  // Ajustar tamaño de canvas según PDF
  ajustarTamañoCanvas(viewport.width, viewport.height);

  // Renderizar PDF en pdfCanvas
  await page.render({
    canvasContext: pdfCtx,
    viewport: viewport,
  }).promise;

  // Inicializar SignaturePad
  initSignaturePad();
});

clearBtn.addEventListener('click', () => {
  signaturePad.clear();
});

saveBtn.addEventListener('click', () => {
  if (signaturePad.isEmpty()) {
    alert('Por favor, firmá antes de confirmar.');
    return;
  }

  // Crear canvas temporal para combinar PDF + firma
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = pdfCanvas.width;
  combinedCanvas.height = pdfCanvas.height;
  const ctx = combinedCanvas.getContext('2d');

  // Dibujar PDF
  ctx.drawImage(pdfCanvas, 0, 0);

  // Dibujar firma encima
  ctx.drawImage(sigCanvas, 0, 0);

  // Descargar imagen combinada como PNG
  combinedCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-firmado.png'; // ojo: es PNG, no PDF (para eso backend)
    a.click();
    URL.revokeObjectURL(url);
  });
});