// Clase para representar una caja de texto
export let pdfContainer; // <-- declaralo global para el módulo
export class CajaTexto {
    constructor(x, y, width, height, text, page, fontSize = 12) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.text = text;
        this.page = page;
        this.fontSize = fontSize;
    }
}
// Arreglo global para guardar las cajas de texto
export const cajas = [];
// Función para agregar cajas
export function agregarCajaDeTexto(x, y, width, height, pageNum, texto = "", fontSize = 12) {
    const caja = new CajaTexto(x, y, width, height, texto, pageNum, fontSize);
    cajas.push(caja);
    return caja;
}
// Obtener cajas por página
export function obtenerCajasDeTexto(pageNum) {
    return cajas.filter(c => c.page === pageNum);
}
// Crea un input DOM para la caja y sincroniza su texto
export function crearInputParaCaja(caja) {
    const input = document.createElement("input");
    input.className = "text-overlay pdf-textbox";
    input.type = "text";
    input.value = caja.text || "";
    input.dataset.page = String(caja.page);
    input.style.position = "absolute";
    input.style.left = caja.x + "px";
    input.style.top = caja.y + "px";
    input.style.width = caja.width + "px";
    input.style.height = caja.height + "px";
    input.style.fontSize = caja.fontSize + "px";
    input.style.border = "1px solid #000";
    input.style.background = "rgba(255,255,255,0.8)";
    input.style.zIndex = "1000";
    input.addEventListener("input", () => {
        caja.text = input.value;
    });
    document.getElementById("pdf-viewer-container")?.appendChild(input);
    return input;
}
export function setPdfContainer(container) {
    pdfContainer = container;
    pdfContainer.style.position = 'relative';
}
// Renderiza solo las cajas de una página (por si quieres refrescar)
export function renderCajasTexto(pageNum) {
    pdfContainer.querySelectorAll('.pdf-textbox').forEach(el => el.remove());
    const cajasPagina = cajas.filter(c => c.page === pageNum); // <-- usar el array global
    const dpr = window.devicePixelRatio || 1;
    cajasPagina.forEach(c => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'pdf-textbox';
        input.style.position = 'absolute';
        input.style.left = `${c.x}px`;
        input.style.top = `${c.y}px`;
        input.style.width = `${c.width}px`;
        input.style.height = `${c.height}px`;
        input.style.fontSize = `${c.fontSize}px`;
        input.style.border = '1px solid #000';
        input.style.background = 'rgba(255,255,255,0.8)';
        input.style.zIndex = '1000';
        input.value = c.text;
        input.addEventListener('input', () => {
            c.text = input.value; // sincroniza el modelo con lo que escribe el usuario
        });
        pdfContainer.appendChild(input);
    });
}
