//---------------------------------------------------------------------------------------------
//IMPORTS
//---------------------------------------------------------------------------------------------
import { agregarCajaDeTexto, renderCajasTexto, setPdfContainer } from "./PDFHandler.js";
import { getMousePos, getTouchPos } from "./signUtils.js";
import { crearInputParaCaja, obtenerCajasDeTexto } from "./TextBox.js";
// Get the global reference to the PDF.js library (pdfjsLib) which
// is loaded as an external script in the browser. This library lets
// us load, view, and manipulate PDFs on the client side. 
const pdfjsLib = window.pdfjsLib;
const rgb = window.PDFLib.rgb;
// Get the global reference to the PDFDocument class from the pdf-lib
// library (PDFLib), also loaded as an external script. This class
// allows us to create and modify PDF files programmatically.
const PDFDocument = window.PDFLib.PDFDocument;
const container = document.getElementById("pdfContainer");
if (!container)
    throw new Error("No se encontró el contenedor PDF");
setPdfContainer(container);
//---------------------------------------------------------------------------------------------
// DOM ELEMENTS AND CANVAS SETUP
//---------------------------------------------------------------------------------------------
// Get the canvas element with id "pdfCanvas" and tell TypeScript it's an HTMLCanvasElement
const pdfCanvas = document.getElementById("pdfCanvas");
// Get the canvas element with id "sigCanvas" and assert its type as HTMLCanvasElement
const sigCanvas = document.getElementById("sigCanvas");
// Get the div element with id "pdfContainer" and assert its type as HTMLDivElement
// Get the 2D drawing context from the PDF canvas for rendering the PDF pages
const pdfCtx = pdfCanvas.getContext("2d");
// Get the 2D drawing context from the signature canvas for capturing the signature
let sigCtx = sigCanvas.getContext("2d");
//---------------------------------------------------------------------------------------------
// STATE VARIABLES AND DATA STRUCTURES
//---------------------------------------------------------------------------------------------
// `pdfDoc` holds the loaded PDF with PDF.js, allowing access to its pages and total page count. 
// It’s checked before rendering or navigating using `getPage()` and `numPages`.
let pdfDoc = null;
let currentPage = 1;
// `drawing` tracks whether the user is currently drawing on the signature canvas,
// enabling drawing only while the mouse button is held down.
let drawing = false;
// `fileBuffer` stores the raw PDF file data as a Uint8Array, used for loading and MODIFYING the PDF.
let fileBuffer = null;
// Object to store the signatures for each PDF page.
// Key = page number (1, 2, 3...), Value = signature image 
// in base64 format (data URL) drawn by the user.
const signs = {};
//---------------------------------------------------------------------------------------------
// PDF PAGES NAVIGATION
//---------------------------------------------------------------------------------------------
// When the "Previous Page" button is clicked:
// 1. Check if the current page number is greater than 1 (can't go before the first page).
// 2. Save the current signature to the `signs` object so it’s not lost.
// 3. Decrease the `currentPage` counter by 1.
// 4. Render the new current page.
document.getElementById("prevPage").onclick = () => {
    if (currentPage > 1) {
        saveSignInPage();
        currentPage--;
        renderPage(currentPage);
    }
};
// When the "Next Page" button is clicked:
// 1. Verify that a PDF is loaded (`pdfDoc`) and that the current page is less than the total number of pages.
// 2. Save the current signature to the `signs` object.
// 3. Increase the `currentPage` counter by 1.
// 4. Render the updated current page.
document.getElementById("nextPage").onclick = () => {
    if (pdfDoc && currentPage < pdfDoc.numPages) {
        saveSignInPage();
        currentPage++;
        renderPage(currentPage);
    }
};
//Render the specified PDF page number
async function renderPage(pageNum) {
    if (!pdfDoc)
        return;
    const page = await pdfDoc.getPage(pageNum);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: 1 });
    pdfCanvas.width = viewport.width * dpr;
    pdfCanvas.height = viewport.height * dpr;
    pdfCanvas.style.width = viewport.width + "px";
    pdfCanvas.style.height = viewport.height + "px";
    sigCanvas.width = viewport.width * dpr;
    sigCanvas.height = viewport.height * dpr;
    sigCanvas.style.width = viewport.width + "px";
    sigCanvas.style.height = viewport.height + "px";
    container.style.width = viewport.width + "px";
    container.style.height = viewport.height + "px";
    pdfCtx.setTransform(1, 0, 0, 1, 0, 0);
    pdfCtx.scale(dpr, dpr);
    sigCtx = sigCanvas.getContext("2d");
    sigCtx.lineJoin = "round";
    sigCtx.lineCap = "round";
    sigCtx.strokeStyle = "rgba(0,0,0,0.8)";
    sigCtx.lineWidth = 3 * dpr;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    if (signs[pageNum]) {
        const img = new Image();
        img.onload = () => sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height);
        img.src = signs[pageNum];
    }
    const renderContext = { canvasContext: pdfCtx, viewport };
    await page.render(renderContext).promise;
    document.getElementById("pageNum").textContent = String(currentPage);
    document.getElementById("pageCount").textContent = String(pdfDoc.numPages);
    // <-- Aquí agregamos la línea para que las cajas de texto se actualicen
    renderCajasTexto(currentPage);
}
// Event triggered when the mouse button is pressed down on the signature canvas
// Starts a new drawing path at the current mouse position
sigCanvas.addEventListener("mousedown", e => {
    drawing = true; // Enable drawing mode
    const pos = getMousePos(sigCanvas, e); // Get current mouse position relative to the canvas
    sigCtx.beginPath(); // Start a new path for drawing
    sigCtx.moveTo(pos.x, pos.y); // Move the drawing cursor to the starting position
});
// Event triggered when the mouse moves over the signature canvas
// Draws a line to the new mouse position if drawing mode is enabled
sigCanvas.addEventListener("mousemove", e => {
    if (!drawing)
        return; // Only draw if the mouse button is pressed
    const pos = getMousePos(sigCanvas, e); // Get the current mouse position
    sigCtx.lineTo(pos.x, pos.y); // Draw a line to the current position
    sigCtx.stroke(); // Render the stroke on the canvas
});
// Event triggered when the mouse button is released on the canvas
// Stops the drawing mode to prevent further drawing
sigCanvas.addEventListener("mouseup", () => (drawing = false));
// Event triggered when the mouse leaves the canvas area
// Stops drawing to avoid unwanted strokes outside the canvas
sigCanvas.addEventListener("mouseleave", () => (drawing = false));
// Load the PDF file when the page finishes loading
window.addEventListener("DOMContentLoaded", async () => {
    const nombreArchivo = window.location.pathname.split("/").pop(); // Extract file name from URL path
    if (!nombreArchivo)
        return; // Exit if no file name is found
    const url = `/uploads/${nombreArchivo}`; // Construct the URL to fetch the PDF
    const response = await fetch(url); // Fetch the PDF file from the server
    if (!response.ok) {
        alert("No se pudo cargar el PDF"); // Alert if the PDF couldn't be loaded
        return;
    }
    const arrayBuffer = await response.arrayBuffer(); // Read response as ArrayBuffer
    const typedarray = new Uint8Array(arrayBuffer); // Convert to typed array for PDF.js
    fileBuffer = typedarray.slice(); // Store a copy of the file buffer
    // Configure PDF.js worker script to handle PDF parsing in a separate thread
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";
    // Load the PDF document into pdfDoc object and set the first page as current
    pdfDoc = await pdfjsLib.getDocument(typedarray).promise;
    currentPage = 1;
    const nombre = agregarCajaDeTexto(130, 600, 140, 15, 1);
    crearInputParaCaja(nombre);
    const dni = agregarCajaDeTexto(300, 600, 100, 15, 1);
    crearInputParaCaja(dni);
    renderPage(currentPage); // Render the first page of the PDF
});
// Save the current signature drawn on the canvas for the active page
function saveSignInPage() {
    const imgData = sigCanvas.toDataURL("image/png"); // Get signature as base64 PNG image
    signs[currentPage] = imgData; // Store it keyed by current page number
}
// Apply all saved signatures to the PDF and trigger download of signed PDF
// Función para guardar PDF con firmas y textos
export async function guardarFirma() {
    console.log("guardarFirma llamada");
    if (!fileBuffer) {
        console.error("fileBuffer vacío");
        return;
    }
    saveSignInPage(); // Guardar firma actual
    const pdfDocLib = await PDFDocument.load(fileBuffer);
    const pages = pdfDocLib.getPages();
    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        // 1️⃣ Firmas
        const imgData = signs[i + 1];
        if (imgData) {
            const pngImage = await pdfDocLib.embedPng(imgData);
            const { width, height } = page.getSize();
            page.drawImage(pngImage, { x: 0, y: 0, width, height });
        }
        // 2️⃣ Cajas de texto
        const cajasPagina = obtenerCajasDeTexto(i + 1);
        console.log("Cajas página", i + 1, cajasPagina);
        for (const caja of cajasPagina) {
            page.drawText(caja.text || "", {
                x: caja.x,
                y: page.getHeight() - caja.y - caja.height, // Ajuste de coordenadas
                size: 12,
                color: rgb(0, 0, 0),
            });
        }
    }
    const pdfBytes = await pdfDocLib.save();
    // Crear JSON archive con el código del PDF firmado
    const pdfBase64 = `data:application/pdf;base64,${btoa(String.fromCharCode(...pdfBytes))}`;
    // Extraer información del archivo desde la URL
    const nombreArchivo = window.location.pathname.split("/").pop() || "";
    // Obtener parámetros del remito desde sessionStorage
    const storedRemitoData = sessionStorage.getItem('currentRemito');
    let remitoInfo = {};
    if (storedRemitoData) {
        remitoInfo = JSON.parse(storedRemitoData);
    }
    // Crear JSON archive con toda la información
    const jsonArchive = {
        metadata: {
            ...remitoInfo,
            nombreArchivo,
            url: window.location.href,
            firmadoEn: new Date().toISOString(),
            userAgent: navigator.userAgent
        },
        pdfBase64Code: pdfBase64,
        signatureData: {
            firmas: signs,
            cajasTexto: Object.fromEntries(pages.map((_, i) => [i + 1, obtenerCajasDeTexto(i + 1)]))
        }
    };
    try {
        // Enviar JSON archive al servidor para guardarlo
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
      mutation GuardarJsonArchive($data: String!) {
        guardarJsonArchive(data: $data)
      }
    `,
                variables: {
                    key: `${remitoInfo.cpy}-${remitoInfo.stofcy}-${remitoInfo.sdhnum}`,
                    jsonData: jsonArchive
                }
            })
        });
        const result = await response.json();
        if (result.data?.guardarJsonArchive?.success) {
            console.log("JSON archive guardado exitosamente:", result.data.guardarJsonArchive);
            alert(`PDF firmado y JSON archive creado exitosamente.\nArchivo JSON: ${result.data.guardarJsonArchive.jsonFile}`);
            // Notificar a la ventana padre para actualizar la UI
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'PDF_SIGNED',
                    data: { ...remitoInfo, jsonFile: result.data.guardarJsonArchive.jsonFile }
                }, '*');
            }
        }
        else {
            console.error("Error guardando JSON archive:", result);
            throw new Error("Error guardando JSON archive en el servidor");
        }
    }
    catch (error) {
        console.error("Error enviando al servidor:", error);
        alert("Advertencia: El PDF se descargará localmente, pero no se pudo crear el JSON archive en el servidor.");
    }
    // Descargar PDF localmente siempre
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf_firmado.pdf";
    a.click();
    URL.revokeObjectURL(url);
}
// Mousedown -> touchstart
sigCanvas.addEventListener("touchstart", e => {
    e.preventDefault(); // evita scroll mientras dibujas
    drawing = true;
    const pos = getTouchPos(sigCanvas, e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
});
// Mousemove -> touchmove
sigCanvas.addEventListener("touchmove", e => {
    e.preventDefault(); // evita scroll mientras dibujas
    if (!drawing)
        return;
    const pos = getTouchPos(sigCanvas, e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
});
// Mouseup -> touchend
sigCanvas.addEventListener("touchend", e => {
    e.preventDefault();
    drawing = false;
});
// Mouseleave -> touchcancel
sigCanvas.addEventListener("touchcancel", e => {
    e.preventDefault();
    drawing = false;
});
// Expose the guardarFirma function globally for the HTML button to call
// @ts-ignore — Ignore TypeScript error because of dynamic property assignment
window.guardarFirma = guardarFirma;
