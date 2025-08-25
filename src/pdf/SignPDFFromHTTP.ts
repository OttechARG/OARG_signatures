//---------------------------------------------------------------------------------------------
//IMPORTS
//---------------------------------------------------------------------------------------------

import { addTextBox, renderTextBoxes, setPdfContainer } from "./PDFHandler.js";
import { getMousePos, getTouchPos } from "./signUtils.js";
// Importar solo el tipo TypeScript 'PDFDocumentProxy' de pdfjs-dist
// para ayudar con la verificación de tipos al trabajar con documentos PDF.js (sin salida de código).
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { cajas, createInputForBox, getTextBoxes } from "../ui/TextBox.js";

// Error popup utility function
function showErrorPopup(message: string) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  
  // Create popup content - clean and simple
  const popup = document.createElement('div');
  popup.style.backgroundColor = 'white';
  popup.style.padding = '30px';
  popup.style.borderRadius = '6px';
  popup.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.12)';
  popup.style.maxWidth = '420px';
  popup.style.width = '90%';
  popup.style.textAlign = 'center';
  popup.style.border = '1px solid #e5e5e5';
  
  // Create error message - simple and clear
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.margin = '0 0 25px 0';
  messageEl.style.color = '#333';
  messageEl.style.fontSize = '16px';
  messageEl.style.lineHeight = '1.4';
  messageEl.style.fontWeight = '400';
  
  // Create close button with theme colors
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Cerrar';
  closeBtn.style.padding = '10px 20px';
  closeBtn.style.backgroundColor = 'var(--theme-primary)';
  closeBtn.style.color = 'white';
  closeBtn.style.border = 'none';
  closeBtn.style.borderRadius = '4px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '14px';
  closeBtn.style.fontWeight = '500';
  
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
  };
  
  popup.appendChild(messageEl);
  popup.appendChild(closeBtn);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

// Obtener la referencia global a la librería PDF.js (pdfjsLib) que
// se carga como un script externo en el navegador. Esta librería nos permite
// cargar, visualizar y manipular PDFs en el lado del cliente. 
const pdfjsLib = window.pdfjsLib;
const rgb = (window as any).PDFLib.rgb; 
// Obtener la referencia global a la clase PDFDocument de la librería pdf-lib
// (PDFLib), también cargada como un script externo. Esta clase
// nos permite crear y modificar archivos PDF programáticamente.
const PDFDocument = window.PDFLib.PDFDocument;
const container = document.getElementById("pdf-viewer-container") as HTMLDivElement;
if (!container) throw new Error("No se encontró el contenedor PDF");
setPdfContainer(container);

//---------------------------------------------------------------------------------------------
// DOM ELEMENTS AND CANVAS SETUP
//---------------------------------------------------------------------------------------------

// Obtener el elemento canvas con id "pdfCanvas" e indicar a TypeScript que es un HTMLCanvasElement
const pdfCanvas = document.getElementById("pdf-display-canvas") as HTMLCanvasElement;

// Obtener el elemento canvas con id "sigCanvas" y asegurar su tipo como HTMLCanvasElement
const sigCanvas = document.getElementById("signature-canvas") as HTMLCanvasElement;

// Obtener el elemento div con id "pdfContainer" y asegurar su tipo como HTMLDivElement


// Obtener el contexto de dibujo 2D del canvas PDF para renderizar las páginas del PDF
const pdfCtx = pdfCanvas.getContext("2d")!;

// Obtener el contexto de dibujo 2D del canvas de firma para capturar la firma
let sigCtx = sigCanvas.getContext("2d")!;






//---------------------------------------------------------------------------------------------
// STATE VARIABLES AND DATA STRUCTURES
//---------------------------------------------------------------------------------------------

// `pdfDoc` holds the loaded PDF with PDF.js, allowing access to its pages and total page count. 
// It’s checked before rendering or navigating using `getPage()` and `numPages`.
let pdfDoc: PDFDocumentProxy | null = null;

let currentPage = 1;
// `drawing` tracks whether the user is currently drawing on the signature canvas,
// enabling drawing only while the mouse button is held down.
let drawing = false;

// `fileBuffer` stores the raw PDF file data as a Uint8Array, used for loading and MODIFYING the PDF.
let fileBuffer: Uint8Array | null = null;

// Object to store the signatures for each PDF page.
// Key = page number (1, 2, 3...), Value = signature image 
// in base64 format (data URL) drawn by the user.
const signs: Record<number, string> = {};


//---------------------------------------------------------------------------------------------
// PDF PAGES NAVIGATION
//---------------------------------------------------------------------------------------------

// When the "Previous Page" button is clicked:
// 1. Check if the current page number is greater than 1 (can't go before the first page).
// 2. Save the current signature to the `signs` object so it’s not lost.
// 3. Decrease the `currentPage` counter by 1.
// 4. Render the new current page.
(document.getElementById("prevPage") as HTMLButtonElement).onclick = () => {
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
(document.getElementById("nextPage") as HTMLButtonElement).onclick = () => {
  if (pdfDoc && currentPage < pdfDoc.numPages) {
    saveSignInPage();
    currentPage++;
    renderPage(currentPage);
  }
};


//Render the specified PDF page number
async function renderPage(pageNum: number): Promise<void> {
    if (!pdfDoc) return;
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

    sigCtx = sigCanvas.getContext("2d")!;
    sigCtx.lineJoin = "round";
    sigCtx.lineCap = "round";
    sigCtx.strokeStyle = "rgba(0,0,0,0.8)";
    sigCtx.lineWidth = 0.5 * dpr;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);

    if (signs[pageNum]) {
        const img = new Image();
        img.onload = () => sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height);
        img.src = signs[pageNum];
    }

    const renderContext = { canvasContext: pdfCtx, viewport };
    await page.render(renderContext).promise;

    (document.getElementById("pageNum") as HTMLElement).textContent = String(currentPage);
    (document.getElementById("pageCount") as HTMLElement).textContent = String(pdfDoc.numPages);

    // <-- Aquí agregamos la línea para que las cajas de texto se actualicen
    renderTextBoxes(currentPage);
}

// Event triggered when the mouse button is pressed down on the signature canvas
// Starts a new drawing path at the current mouse position
sigCanvas.addEventListener("mousedown", e => {
  drawing = true;                           // Enable drawing mode
  const pos = getMousePos(sigCanvas, e);  // Get current mouse position relative to the canvas
  sigCtx.beginPath();                       // Start a new path for drawing
  sigCtx.moveTo(pos.x, pos.y);             // Move the drawing cursor to the starting position
});

// Event triggered when the mouse moves over the signature canvas
// Draws a line to the new mouse position if drawing mode is enabled
sigCanvas.addEventListener("mousemove", e => {
  if (!drawing) return;                     // Only draw if the mouse button is pressed
  const pos = getMousePos(sigCanvas, e);  // Get the current mouse position
  sigCtx.lineTo(pos.x, pos.y);             // Draw a line to the current position
  sigCtx.stroke();                         // Render the stroke on the canvas
});

// Event triggered when the mouse button is released on the canvas
// Stops the drawing mode to prevent further drawing
sigCanvas.addEventListener("mouseup", () => (drawing = false));

// Event triggered when the mouse leaves the canvas area
// Stops drawing to avoid unwanted strokes outside the canvas
sigCanvas.addEventListener("mouseleave", () => (drawing = false));
let isRedirecting = false;

// Prevent navigation back - PDF should only be viewable once
window.addEventListener("pageshow", (e: PageTransitionEvent) => {
  if (isRedirecting) return; // Prevent double execution

  const pdfDataString = sessionStorage.getItem('pdfToSign');

  // If page is loaded from cache (back/forward navigation) or no PDF data exists
  if (e.persisted || !pdfDataString) {
    isRedirecting = true;
    console.log("Navigation prevention triggered: PDF can only be viewed once");
    
    // Clean up any remaining data
    sessionStorage.removeItem('pdfToSign');
    sessionStorage.removeItem('currentRemito');
    
    // Use replace to avoid adding to browser history
    window.location.replace("/");
  }
});

// Additional protection: prevent browser back button
window.addEventListener("beforeunload", () => {
  // Clean up data when leaving the page naturally
  if (!isRedirecting) {
    sessionStorage.removeItem('pdfToSign');
    sessionStorage.removeItem('currentRemito');
  }
});
// Load the PDF file when the page finishes loading
window.addEventListener("DOMContentLoaded", async () => {
  
  // Get PDF data from sessionStorage instead of fetching from uploads
  const pdfDataString = sessionStorage.getItem('pdfToSign');
  if (!pdfDataString) {
    window.location.href = "/";
    return;
  }

  const pdfData = JSON.parse(pdfDataString);
  if (!pdfData.base64) {
    alert("Datos PDF inválidos. Por favor regresa e inténtalo de nuevo.");
    return;
  }

  setupFontSizeControl();

  // Convert base64 to Uint8Array for PDF.js
  const binaryString = atob(pdfData.base64);                        // Decode base64 to binary string
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  fileBuffer = bytes.slice();                                       // Store a copy of the file buffer

  // Configure PDF.js worker script to handle PDF parsing in a separate thread
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

  // Load the PDF document into pdfDoc object and set the first page as current
  pdfDoc = await (pdfjsLib as any).getDocument(bytes).promise;
  currentPage = 1;
  
  // Get total number of pages
  if (!pdfDoc) {
    console.error("Error al cargar el documento PDF");
    return;
  }
  const totalPages = pdfDoc.numPages;
  
  // Create text boxes from coordinates if available
  console.log("PDF Data:", pdfData);
  console.log("PDF Data coordinates:", pdfData.coordinates);
  
  if (pdfData.coordinates && pdfData.coordinates.coordenadas) {
    console.log("Using coordinates from server:", pdfData.coordinates.coordenadas);
    // Create text boxes on all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      pdfData.coordinates.coordenadas.forEach((coord: any) => {
        const key = Object.keys(coord)[0]; // Get the field name (Nombre, DNI, etc.)
        const coordinates = coord[key];
        
        // Skip Firma field as it's handled separately
        if (key !== "Firma" && coordinates) {
          console.log(`Creating textbox for ${key} with coordinates: ${coordinates} on page ${pageNum}`);
          const textBox = addTextBox(coordinates, pageNum, "", 12);
          console.log("Created textBox:", textBox);
          // Only create DOM input for current page (page 1)
          if (pageNum === 1) {
            createInputForBox(textBox);
          }
        }
      });
    }
  } else {
    console.log("No coordinates found, using fallback hardcoded boxes");
    // Fallback to hardcoded boxes if no coordinates provided
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const nombre = addTextBox("130.600;270.615", pageNum);
      const dni = addTextBox("300.600;400.615", pageNum);
      // Only create DOM inputs for current page (page 1)
      if (pageNum === 1) {
        createInputForBox(nombre);
        createInputForBox(dni);
      }
    }
  }
  
  renderPage(currentPage);                                           // Render the first page of the PDF

  // Clean up sessionStorage after successful load
  sessionStorage.removeItem('pdfToSign');
});
function setupFontSizeControl(): void {
  const fontSizeSlider = document.getElementById("fontSize") as HTMLInputElement;
  const fontSizeValue = document.getElementById("fontSizeValue") as HTMLSpanElement;
  
  if (!fontSizeSlider || !fontSizeValue) return;
  
  fontSizeSlider.addEventListener("input", () => {
    const newSize = parseInt(fontSizeSlider.value);
    fontSizeValue.textContent = `${newSize}px`;
    
    // Update all text boxes on current page
    updateTextBoxFontSize(currentPage, newSize);
  });
}

// Update font size for all text boxes on a specific page
function updateTextBoxFontSize(pageNum: number, fontSize: number): void {
  // Update the fontSize property in the CajaTexto objects
  cajas.forEach(caja => {
    if (caja.page === pageNum) {
      caja.fontSize = fontSize;
    }
  });
  
  // Update the DOM elements - look for both class names
  const textBoxes = container.querySelectorAll<HTMLInputElement>('.pdf-textbox, .text-overlay');
  textBoxes.forEach(input => {
    const inputPage = parseInt(input.dataset.page || '0');
    if (inputPage === pageNum) {
      input.style.fontSize = `${fontSize}px`;
    }
  });
}
// Save the current signature drawn on the canvas for the active page
function saveSignInPage(): void {
  const imgData = sigCanvas.toDataURL("image/png");                  // Get signature as base64 PNG image
  signs[currentPage] = imgData;                                      // Store it keyed by current page number
}

// Clear the signature from the current page only
function clearCurrentPageSignature(): void {
  // Clear the signature canvas
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  
  // Remove the signature from the signs object for current page
  delete signs[currentPage];
  
  console.log(`Signature cleared for page ${currentPage}`);
}

// Apply all saved signatures to the PDF and trigger download of signed PDF
export async function saveSignature(): Promise<void> {
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
    const cajasPagina = getTextBoxes(i + 1);
    for (const caja of cajasPagina) {
      page.drawText(caja.text || "", {
        x: caja.x,
        y: page.getHeight() - caja.y - caja.height,
        size: caja.fontSize,
        color: rgb(0, 0, 0),
      });
    }
  }

  const pdfBytes = await pdfDocLib.save();

  const storedRemitoData = sessionStorage.getItem('currentRemito');
  let remitoInfo: any = {};
  if (storedRemitoData) remitoInfo = JSON.parse(storedRemitoData);

  try {
    if (remitoInfo.sdhnum) {
      console.log("Sending PDF to SOAP endpoint...");
      const soapResponse = await fetch('/send-signed-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          NREMITO: remitoInfo.sdhnum,
          PRPT64: btoa(String.fromCharCode(...pdfBytes))
        })
      });

      const soapResult = await soapResponse.json();
      if (soapResult.success) {
        // On success, redirect without showing popup
        console.log("PDF enviado exitosamente via SOAP");
      } else {
        showErrorPopup("Error enviando PDF via SOAP");
        return; // Don't redirect on error
      }
    } else {
      showErrorPopup("No se encontró número de remito, omitiendo envío SOAP");
      return; // Don't redirect on error
    }
  } catch (error) {
    console.error('Error calling SOAP endpoint:', error);
    showErrorPopup("Error llamando endpoint SOAP");
    return; // Don't redirect on error
  }
  
  // Only clean up and redirect if we reach here (success case)
  sessionStorage.removeItem('pdfToSign');
  sessionStorage.removeItem('currentRemito');
  window.location.href = "/";
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
  if (!drawing) return;
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
// Add event listener for the "Borrar" button
const borrarBtn = document.getElementById("borrarBtn") as HTMLButtonElement;
if (borrarBtn) {
  borrarBtn.addEventListener("click", () => {
    clearCurrentPageSignature();
  });
}

// Expose the guardarFirma function globally for the HTML button to call
// @ts-ignore — Ignore TypeScript error because of dynamic property assignment
(window as any).guardarFirma = saveSignature;
