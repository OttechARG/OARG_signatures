import { cajas, CajaTexto, crearInputParaCaja, obtenerCajasDeTexto } from "./TextBox.js";
export let currentPage = 1;
export function setCurrentPage(page) {
    currentPage = page;
}
export let pdfContainer;
export function setPdfContainer(container) {
    pdfContainer = container;
}
export async function llamarMutationSubirPdfBase64(base64) {
    console.log("Inicio de llamada a subirPdfBase64");
    console.log("Tamaño del base64 recibido:", base64.length);
    const query = `
    mutation SubirPdfBase64($pdfBase64: String!) {
      subirPdfBase64(pdfBase64: $pdfBase64) {
        url
      }
    }
  `;
    console.log("Preparando fetch a /graphql");
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query,
            variables: { pdfBase64: base64 }
        }),
    });
    console.log("Fetch completado. Status:", response.status);
    const { data, errors } = await response.json();
    if (errors) {
        console.error("Errores en la respuesta GraphQL:", errors);
        throw new Error(errors.map((e) => e.message).join(', '));
    }
    console.log("URL recibida:", data.subirPdfBase64.url);
    return data.subirPdfBase64.url;
}
// Función para mostrar el PDF con botones Aceptar y Cancelar
export function mostrarPdfConOpciones(blob) {
    const pdfUrl = URL.createObjectURL(blob);
    let modal = document.getElementById('pdfModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pdfModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
    <div style="background:#fff; padding:20px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center;">
<embed src="${pdfUrl}" type="application/pdf" width="600" height="800" />      <div style="margin-top:10px; text-align:center;">
        <button id="btnAceptar" style="margin-right:20px; padding:10px 20px;">Aceptar</button>
        <button id="btnCancelar" style="padding:10px 20px;">Cancelar</button>
      </div>
    </div>
  `;
    const btnAceptar = document.getElementById('btnAceptar');
    const btnCancelar = document.getElementById('btnCancelar');
    btnAceptar?.addEventListener('click', () => {
        alert('Remito aceptado');
        modal.style.display = 'none';
        URL.revokeObjectURL(pdfUrl);
    });
    btnCancelar?.addEventListener('click', () => {
        modal.style.display = 'none';
        URL.revokeObjectURL(pdfUrl);
    });
    modal.style.display = 'flex';
}
// Función auxiliar para convertir Blob a Base64
export function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result;
            // reader.result viene como data:<tipo>;base64,<base64>, queremos solo la parte Base64
            const base64 = base64data.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
//FUNCION PARA RECUPERAR EL DOCUMENTO
export async function recuperarDocumentoBase64ConReintentos(url, maxIntentos = 3) {
    for (let i = 0; i < maxIntentos; i++) {
        try {
            console.log(`Intento ${i + 1} con ${url}`);
            // Obtener Blob (binario)
            const blob = await fetchWithTimeout(url, 9000);
            // Leer los primeros bytes para detectar PDF
            const headerArrayBuffer = await blob.slice(0, 5).arrayBuffer();
            const header = new TextDecoder("utf-8").decode(headerArrayBuffer);
            // Convertir Blob a Base64
            const base64 = await blobToBase64(blob);
            if (header === '%PDF-') {
                console.log("Es PDF, procesando...");
            }
            else {
                alert("Documento recuperado correctamente (no es PDF).");
            }
            const urlHTMLFirmarPDF = await llamarMutationSubirPdfBase64(base64);
            console.log("PDF recibido (URL):", urlHTMLFirmarPDF);
            window.location.href = urlHTMLFirmarPDF;
            // Hacemos fetch para obtener el contenido HTML desde la URL recibida
            return base64;
        }
        catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`Timeout en intento ${i + 1}`);
            }
            else {
                console.warn(`Error en intento ${i + 1}:`, error.message);
            }
        }
    }
    throw new Error(`No se pudo recuperar el documento tras ${maxIntentos} intentos.`);
}
async function fetchWithTimeout(url, timeout = 9000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!response.ok)
            throw new Error(`Error en la respuesta: ${response.statusText}`);
        const blob = await response.blob();
        return blob;
    }
    catch (error) {
        clearTimeout(id);
        throw error;
    }
}
//---------------------------------------------------------------------------------------------
// AGREGAR CAJAS DE TEXTO SOBRE EL PDF
//---------------------------------------------------------------------------------------------
export class BoxText {
    constructor(x, y, width, height, page, texto = "") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.page = page;
        this.texto = texto;
    }
}
const cajasTexto = []; // array global de cajas de texto
export function agregarCajaDeTexto(x, y, width, height, pageNum, texto = "") {
    const caja = new CajaTexto(x, y, width, height, texto, pageNum);
    cajas.push(caja);
    return caja; // ✅ ahora devuelve la caja
}
export function renderCajasTexto(pageNum) {
    // eliminar inputs existentes
    const inputs = document.querySelectorAll("#pdf-viewer-container input[data-page]");
    inputs.forEach(i => i.remove());
    const cajasPagina = obtenerCajasDeTexto(pageNum);
    cajasPagina.forEach(caja => crearInputParaCaja(caja));
}
