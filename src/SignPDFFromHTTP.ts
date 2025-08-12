//---------------------------------------------------------------------------------------------
//IMPORTS
//---------------------------------------------------------------------------------------------

import { getMousePos, getTouchPos } from "./signUtils.js";
// Import only the TypeScript type 'PDFDocumentProxy' from pdfjs-dist
// to help with type checking when working with PDF.js documents (no code output).
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

// Get the global reference to the PDF.js library (pdfjsLib) which
// is loaded as an external script in the browser. This library lets
// us load, view, and manipulate PDFs on the client side. 
const pdfjsLib = window.pdfjsLib;

// Get the global reference to the PDFDocument class from the pdf-lib
// library (PDFLib), also loaded as an external script. This class
// allows us to create and modify PDF files programmatically.
const PDFDocument = window.PDFLib.PDFDocument;







//---------------------------------------------------------------------------------------------
// DOM ELEMENTS AND CANVAS SETUP
//---------------------------------------------------------------------------------------------

// Get the canvas element with id "pdfCanvas" and tell TypeScript it's an HTMLCanvasElement
const pdfCanvas = document.getElementById("pdfCanvas") as HTMLCanvasElement;

// Get the canvas element with id "sigCanvas" and assert its type as HTMLCanvasElement
const sigCanvas = document.getElementById("sigCanvas") as HTMLCanvasElement;

// Get the div element with id "pdfContainer" and assert its type as HTMLDivElement
const pdfContainer = document.getElementById("pdfContainer") as HTMLDivElement;

// Get the 2D drawing context from the PDF canvas for rendering the PDF pages
const pdfCtx = pdfCanvas.getContext("2d")!;

// Get the 2D drawing context from the signature canvas for capturing the signature
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
 // If there is no loaded PDF document, exit early and do nothing
    if (!pdfDoc) return;

  // Retrieve the PDF page corresponding to the given page number `pageNum`
  // This is an asynchronous operation because loading the page may take some time
    const page = await pdfDoc.getPage(pageNum);

  // Get the device pixel ratio for proper scaling (e.g., on Retina displays)
  // This ensures the page renders sharply on high-resolution screens
  // Defaults to 1 if the value is not available
    const dpr = window.devicePixelRatio || 1;

  // Create a viewport for the page at scale 1 (original size, no zoom)
  // The viewport defines the dimensions and transformations needed to display the page correctly
    const viewport = page.getViewport({ scale: 1 });

    // 1. Set the internal resolution of the PDF canvas by multiplying by `dpr`.
    // This makes the canvas have more pixels internally, ensuring sharp rendering on high-DPI screens.
    pdfCanvas.width = viewport.width * dpr;
    pdfCanvas.height = viewport.height * dpr;

    // 2. Set the visible (CSS) size of the PDF canvas to the PDF’s natural size in CSS pixels (without scaling by `dpr`).
    // This ensures the canvas appears at the correct size on screen regardless of its internal resolution.
    pdfCanvas.style.width = viewport.width + "px";
    pdfCanvas.style.height = viewport.height + "px";

    // 3. Do the same for the signature canvas (`sigCanvas`), so it has matching resolution and visible size.
    // This is crucial to keep the signature perfectly aligned with the PDF content.
    sigCanvas.width = viewport.width * dpr;
    sigCanvas.height = viewport.height * dpr;
    sigCanvas.style.width = viewport.width + "px";
    sigCanvas.style.height = viewport.height + "px";

    // 4. Finally, set the container div size to exactly fit the PDF page size.
    // This ensures the canvases stack correctly within the container.
    pdfContainer.style.width = viewport.width + "px";
    pdfContainer.style.height = viewport.height + "px";

    // Prepare PDF canvas context for rendering the page
    pdfCtx.setTransform(1, 0, 0, 1, 0, 0);  // Reset any existing transforms matriz
    pdfCtx.scale(dpr, dpr);                 // Scale context to account for device pixel ratio (hiqh quality)

    // Get the 2D drawing context of the signature canvas to enable drawing on it
    sigCtx = sigCanvas.getContext("2d")!; 

    // Configure line properties to make the signature strokes smooth and rounded
    sigCtx.lineJoin = "round";
    sigCtx.lineCap = "round";
    sigCtx.strokeStyle = "rgba(0,0,0,0.8)";
    sigCtx.lineWidth = viewport.height * 0.005;

    // Clear the entire signature canvas to erase any previous drawings before starting new ones
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);

    // If there is already a saved signature for the current page (`pageNum`),
    // we need to redraw it on the signature canvas so it appears when revisiting the page.
    if (signs[pageNum]) {
        const img = new Image();
        img.onload = () => {
        sigCtx.drawImage(img, 0, 0, sigCanvas.width, sigCanvas.height);
        };
        img.src = signs[pageNum];
    }

    // Prepare the rendering context for the PDF page, providing the canvas context and the viewport
    const renderContext = {
    canvasContext: pdfCtx,   // The 2D rendering context of the canvas where the PDF page will be drawn
    viewport: viewport       // The viewport defines the size and scale for rendering the page
    };

    // Render the PDF page on the canvas and wait until rendering completes
    await page.render(renderContext).promise;

    // Update the displayed current page number in the HTML element with id "pageNum"
    (document.getElementById("pageNum") as HTMLElement).textContent = String(currentPage);

    // Update the displayed total number of pages in the HTML element with id "pageCount"
    (document.getElementById("pageCount") as HTMLElement).textContent = String(pdfDoc.numPages);}

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


// Load the PDF file when the page finishes loading
window.addEventListener("DOMContentLoaded", async () => {
  const nombreArchivo = window.location.pathname.split("/").pop();  // Extract file name from URL path
  if (!nombreArchivo) return;                                        // Exit if no file name is found

  const url = `/uploads/${nombreArchivo}`;                           // Construct the URL to fetch the PDF
  const response = await fetch(url);                                 // Fetch the PDF file from the server
  if (!response.ok) {
    alert("No se pudo cargar el PDF");                              // Alert if the PDF couldn't be loaded
    return;
  }

  const arrayBuffer = await response.arrayBuffer();                 // Read response as ArrayBuffer
  const typedarray = new Uint8Array(arrayBuffer);                    // Convert to typed array for PDF.js
  fileBuffer = typedarray.slice();                                   // Store a copy of the file buffer

  // Configure PDF.js worker script to handle PDF parsing in a separate thread
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

  // Load the PDF document into pdfDoc object and set the first page as current
  pdfDoc = await (pdfjsLib as any).getDocument(typedarray).promise;
  currentPage = 1;
  renderPage(currentPage);                                           // Render the first page of the PDF
});

// Save the current signature drawn on the canvas for the active page
function saveSignInPage(): void {
  const imgData = sigCanvas.toDataURL("image/png");                  // Get signature as base64 PNG image
  signs[currentPage] = imgData;                                      // Store it keyed by current page number
}

// Apply all saved signatures to the PDF and trigger download of signed PDF
async function guardarFirma(): Promise<void> {
  console.log('guardarFirma llamada');
  if (!fileBuffer) {
    console.error('fileBuffer vacío');                              // Log error if original PDF buffer is missing
    return;
  }

  saveSignInPage();                                                 // Save current page signature before embedding

  const pdfDocLib = await PDFDocument.load(fileBuffer);            // Load the PDF document with PDF-lib library
  const pages = pdfDocLib.getPages();                               // Get all pages in the PDF document

  // Loop through each page and add the saved signature image if available
  for (let i = 0; i < pages.length; i++) {
    const imgData = signs[i + 1];                                  // Get signature image for this page (page index + 1)
    if (!imgData) continue;                                         // Skip if no signature on this page

    const pngImage = await pdfDocLib.embedPng(imgData);            // Embed the PNG signature image into PDF
    const { width, height } = pages[i].getSize();                  // Get page dimensions

    pages[i].drawImage(pngImage, {                                 // Draw the signature image covering the whole page
      x: 0,
      y: 0,
      width: width,
      height: height
    });
  }

  const pdfBytes = await pdfDocLib.save();                         // Save the modified PDF to a byte array
  const blob = new Blob([pdfBytes], { type: "application/pdf" });  // Create a Blob from the PDF bytes
  const url = URL.createObjectURL(blob);                           // Create an object URL for downloading

  const a = document.createElement("a");                          // Create a temporary link element
  a.href = url;
  a.download = "pdf_firmado.pdf";                                 // Set the download file name
  a.click();                                                      // Programmatically click to trigger download
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
// Expose the guardarFirma function globally for the HTML button to call
// @ts-ignore — Ignore TypeScript error because of dynamic property assignment
(window as any).guardarFirma = guardarFirma;