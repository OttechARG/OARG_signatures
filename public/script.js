const pdfInput = document.getElementById('pdfInput');
const pdfViewer = document.getElementById('pdfViewer');
const sigCanvas = document.getElementById('sigCanvas');
const clearBtn = document.getElementById('clearBtn');
const submitBtn = document.getElementById('submitBtn');

const sigPad = new SignaturePad(sigCanvas);
let currentPdfFile = null;

// Mostrar PDF en iframe al subir archivo
pdfInput.addEventListener('change', () => {
  const file = pdfInput.files[0];
  if (!file) return;
  currentPdfFile = file;

  const fileURL = URL.createObjectURL(file);
  pdfViewer.src = fileURL;
});

// Limpiar firma
clearBtn.addEventListener('click', () => {
  sigPad.clear();
});

// Enviar PDF + firma al backend
submitBtn.addEventListener('click', async () => {
  if (!currentPdfFile || sigPad.isEmpty()) {
    alert('Subí un PDF y firmalo primero');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('pdf', currentPdfFile);
    formData.append('firma', sigPad.toDataURL());

    const res = await fetch('/firmar', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error('Error firmando el PDF');
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firmado.pdf';
    a.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    alert(error.message);
    console.error(error);
  }
});