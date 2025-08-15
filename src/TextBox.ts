// Clase para representar una caja de texto

export let pdfContainer: HTMLDivElement; // <-- declaralo global para el módulo
export class CajaTexto {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  page: number; // <-- Agregado
  constructor(x: number, y: number, width: number, height: number, text: string, page: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.text = text;
    this.page = page;
  }
}

// Arreglo global para guardar las cajas de texto
export const cajas: CajaTexto[] = [];

// Función para agregar cajas
export function agregarCajaDeTexto(x: number, y: number, width: number, height: number, pageNum: number, texto: string = "") {
  cajas.push(new CajaTexto(x, y, width, height, texto, pageNum));
}

// Obtener cajas por página
export function obtenerCajasDeTexto(pageNum: number) {
  return cajas.filter(c => c.page === pageNum);
}

// Crea un input DOM para la caja y sincroniza su texto
export function crearInputParaCaja(caja: CajaTexto) {
  const input = document.createElement("input");
  input.className = "text-overlay";
  input.type = "text";
  input.value = caja.text || "";
  input.dataset.page = String(caja.page); // <-- importante
  input.style.position = "absolute";
  input.style.left = caja.x + "px";
  input.style.top = caja.y + "px";
  input.style.width = caja.width + "px";
  input.style.height = caja.height + "px";
  input.style.fontSize = "12px";
  input.addEventListener("input", () => {
    caja.text = input.value; // sincroniza el texto
  });
  document.getElementById("pdf-viewer-container")?.appendChild(input);
}
export function setPdfContainer(container: HTMLDivElement) {
  pdfContainer = container;
  pdfContainer.style.position = 'relative';
}


// Renderiza solo las cajas de una página (por si quieres refrescar)
export function renderCajasTexto(pageNum: number) {
  pdfContainer.querySelectorAll<HTMLInputElement>('.pdf-textbox').forEach(el => el.remove());

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
    input.style.fontSize = '14px';
    input.style.border = '1px solid #000';
    input.style.background = 'rgba(255,255,255,0.8)';
    input.style.zIndex = '1000';
    input.value = c.text; // opcional: poner el texto inicial
    pdfContainer.appendChild(input);
  });
}