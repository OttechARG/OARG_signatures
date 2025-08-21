// Clase para representar una caja de texto

export let pdfContainer: HTMLDivElement; // <-- declaralo global para el módulo
export class CajaTexto {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  page: number;
  fontSize: number;
  constructor(x: number, y: number, width: number, height: number, text: string, page: number, fontSize: number = 12) {
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
export const cajas: CajaTexto[] = [];

// Function to add text boxes using coordinate ranges (PDF points)
export function addTextBox(coordinates: string, pageNum: number, text: string = "", fontSize: number = 12) {
  // Parse coordinates from format "x1.y1;x2.y2" (PDF points)
  const [topLeft, bottomRight] = coordinates.split(';');
  const [x1, y1] = topLeft.split('.').map(Number);
  const [x2, y2] = bottomRight.split('.').map(Number);
  
  // Calculate position and dimensions in PDF points
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  
  const caja = new CajaTexto(x, y, width, height, text, pageNum, fontSize);
  cajas.push(caja);
  return caja;
}

// Obtener cajas por página
export function getTextBoxes(pageNum: number) {
  return cajas.filter(c => c.page === pageNum);
}

// Crea un input DOM para la caja y sincroniza su texto
export function createInputForBox(caja: CajaTexto) {
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
  input.style.border = "none";
  input.style.background = "#f0f0f0";
  input.style.zIndex = "1000";
  input.addEventListener("input", () => {
    caja.text = input.value;
  });
  document.getElementById("pdf-viewer-container")?.appendChild(input);
  return input;
}
export function setPdfContainer(container: HTMLDivElement) {
  pdfContainer = container;
  pdfContainer.style.position = 'relative';
}


// Renderiza solo las cajas de una página (por si quieres refrescar)
export function renderTextBoxes(pageNum: number) {
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
    input.style.fontSize = `${c.fontSize}px`;
    input.style.border = 'none';
    input.style.background = '#f0f0f0';
    input.style.zIndex = '1000';
    input.value = c.text;

      input.addEventListener('input', () => {
        c.text = input.value;  // sincroniza el modelo con lo que escribe el usuario
      });

      pdfContainer.appendChild(input);
  });
}