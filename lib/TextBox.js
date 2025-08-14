// Clase para representar una caja de texto
export class CajaTexto {
    constructor(x, y, width, height, text, page) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.text = text;
        this.page = page;
    }
}
// Arreglo global para guardar las cajas de texto
export const cajas = [];
// Función para agregar cajas
export function agregarCajaDeTexto(x, y, width, height, pageNum, texto = "") {
    cajas.push(new CajaTexto(x, y, width, height, texto, pageNum));
}
// Obtener cajas por página
export function obtenerCajasDeTexto(pageNum) {
    return cajas.filter(c => c.page === pageNum);
}
// Crea un input DOM para la caja y sincroniza su texto
export function crearInputParaCaja(caja) {
    const input = document.createElement("input");
    input.className = "caja-texto";
    input.type = "text";
    input.value = caja.text || "";
    input.style.position = "absolute";
    input.style.left = caja.x + "px";
    input.style.top = caja.y + "px";
    input.style.width = caja.width + "px";
    input.style.height = caja.height + "px";
    input.style.fontSize = "12px";
    input.addEventListener("input", () => {
        caja.text = input.value; // <-- sincroniza el texto con la caja
    });
    document.getElementById("pdfContainer")?.appendChild(input);
}
// Renderiza solo las cajas de una página (por si quieres refrescar)
export function renderCajasTexto(pageNum) {
    const inputs = document.querySelectorAll("#pdfContainer input[data-page]");
    inputs.forEach(i => i.remove()); // eliminamos antiguos inputs
    const cajasPagina = obtenerCajasDeTexto(pageNum);
    cajasPagina.forEach(caja => crearInputParaCaja(caja));
}
