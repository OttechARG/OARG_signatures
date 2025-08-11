const pdfjsLib = window.pdfjsLib;
const PDFDocument = window.PDFLib.PDFDocument;
// Tipos de HTML
const pdfCanvas = document.getElementById("pdfCanvas");
const sigCanvas = document.getElementById("sigCanvas");
const pdfContainer = document.getElementById("pdfContainer");
const pdfCtx = pdfCanvas.getContext("2d");
let sigCtx = sigCanvas.getContext("2d");
let pdfDoc = null;
let currentPage = 1;
let dibujando = false;
let fileBuffer = null;
const firmas = {};
// Obtener posición del mouse en el canvas
function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}
// Navegación entre páginas
document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
        guardarFirmaEnPagina();
        currentPage--;
        renderPage(currentPage);
    }
};
document.getElementById("nextPage").onclick = () => {
    if (pdfDoc && currentPage < pdfDoc.numPages) {
        guardarFirmaEnPagina();
        currentPage++;
        renderPage(currentPage);
    }
};
// Renderizar página PDF
async function renderPage(pageNum) {
    if (!pdfDoc)
        return;
    const page = await pdfDoc.getPage(pageNum);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: 1 });
    // Ajustar tamaños de los canvas
    pdfCanvas.width = viewport.width * dpr;
    pdfCanvas.height = viewport.height * dpr;
    pdfCanvas.style.width = viewport.width + "px";
    pdfCanvas.style.height = viewport.height + "px";
    sigCanvas.width = viewport.width * dpr;
    sigCanvas.height = viewport.height * dpr;
    sigCanvas.style.width = viewport.width + "px";
    sigCanvas.style.height = viewport.height + "px";
    pdfContainer.style.width = viewport.width + "px";
    pdfContainer.style.height = viewport.height + "px";
    // Renderizar PDF
    pdfCtx.setTransform(1, 0, 0, 1, 0, 0);
    pdfCtx.scale(dpr, dpr);
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.lineJoin = "round";
    sigCtx.lineCap = "round";
    sigCtx.strokeStyle = "rgba(0,0,0,0.8)";
    sigCtx.lineWidth = 2;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    // Si ya había firma, volver a dibujarla
    if (firmas[pageNum]) {
        const img = new Image();
        img.onload = () => {
            sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height);
        };
        img.src = firmas[pageNum];
    }
    const renderContext = {
        canvasContext: pdfCtx,
        viewport: viewport
    };
    await page.render(renderContext).promise;
    document.getElementById("pageNum").textContent = String(currentPage);
    document.getElementById("pageCount").textContent = String(pdfDoc.numPages);
}
// Eventos para dibujar firma
sigCanvas.addEventListener("mousedown", e => {
    dibujando = true;
    const pos = getMousePos(sigCanvas, e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
});
sigCanvas.addEventListener("mousemove", e => {
    if (!dibujando)
        return;
    const pos = getMousePos(sigCanvas, e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
});
sigCanvas.addEventListener("mouseup", () => (dibujando = false));
sigCanvas.addEventListener("mouseleave", () => (dibujando = false));
// Cargar PDF al iniciar
window.addEventListener("DOMContentLoaded", async () => {
    const nombreArchivo = window.location.pathname.split("/").pop();
    if (!nombreArchivo)
        return;
    const url = `/uploads/${nombreArchivo}`;
    const response = await fetch(url);
    if (!response.ok) {
        alert("No se pudo cargar el PDF");
        return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const typedarray = new Uint8Array(arrayBuffer);
    fileBuffer = typedarray.slice();
    // Configurar worker de PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";
    pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
    currentPage = 1;
    renderPage(currentPage);
});
// Guardar firma actual
function guardarFirmaEnPagina() {
    const imgData = sigCanvas.toDataURL("image/png");
    firmas[currentPage] = imgData;
}
// Firmar y descargar PDF
async function guardarFirma() {
    console.log('guardarFirma llamada');
    if (!fileBuffer) {
        console.error('fileBuffer vacío');
        return;
    }
    guardarFirmaEnPagina();
    const pdfDocLib = await PDFDocument.load(fileBuffer);
    const pages = pdfDocLib.getPages();
    for (let i = 0; i < pages.length; i++) {
        const imgData = firmas[i + 1];
        if (!imgData)
            continue;
        const pngImage = await pdfDocLib.embedPng(imgData);
        const { width, height } = pages[i].getSize();
        pages[i].drawImage(pngImage, {
            x: 0,
            y: 0,
            width: width,
            height: height
        });
    }
    const pdfBytes = await pdfDocLib.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf_firmado.pdf";
    a.click();
}
// @ts-ignore — para enlazar con el botón del HTML
window.guardarFirma = guardarFirma;
export {};
