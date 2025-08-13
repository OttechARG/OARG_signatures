import { createButton } from "./ButtonsHandler.js";
import { recuperarDocumentoBase64ConReintentos } from "./PDFHandler.js";
export class TableHandler {
    constructor(tableId) {
        this.remitoSeleccionado = null;
        this.tableId = tableId;
    }
    setupColumnFilters() {
        const table = document.getElementById(this.tableId);
        if (!table)
            return;
        const filterInputs = table.querySelectorAll('thead input.filter-input');
        // Listener para cada input
        filterInputs.forEach(input => {
            input.addEventListener('input', () => {
                const filters = Array.from(filterInputs).map(i => ({
                    colIndex: Number(i.dataset.col),
                    value: i.value.toLowerCase().trim()
                }));
                const tbody = table.tBodies[0];
                if (!tbody)
                    return;
                Array.from(tbody.rows).forEach(row => {
                    let visible = true;
                    for (const filter of filters) {
                        if (filter.value) {
                            const cellText = row.cells[filter.colIndex]?.textContent?.toLowerCase() || '';
                            if (!cellText.includes(filter.value)) {
                                visible = false;
                                break;
                            }
                        }
                    }
                    row.style.display = visible ? '' : 'none';
                });
            });
        });
    }
    // Método separado para renderizar la tabla
    renderTable(remitos) {
        const tabla = document.getElementById(this.tableId);
        const tbody = tabla.querySelector('tbody');
        tbody.innerHTML = "";
        for (const r of remitos) {
            const tr = document.createElement('tr');
            tr.dataset.company = r.CPY_0 || r.CPY || "";
            tr.dataset.facility = r.STOFCY_0 || r.STOFAC || "";
            tr.dataset.remito = String(r.SDHNUM_0 || "");
            tr.style.cursor = "pointer";
            tr.innerHTML = `
        <td>${r.SDHNUM_0 || ""}</td>
        <td>${r.DLVDAT_0 || ""}</td>
        <td>${r.BPCORD_0 || ""}</td>
        <td>${r.BPDNAM_0 || ""}</td>
        <td class="${r.FIRMADO_0 ? 'signed-true' : 'signed-false'}">
            ${r.FIRMADO_0 ? '✓' : '✗'}
        </td>
        <td class="recover-doc-cell"></td> <!-- columna para el botón -->
        `;
            tbody.appendChild(tr);
            const tdBoton = tr.querySelector(".recover-doc-cell");
            createButton(tdBoton, {
                id: `recuperarDocumentoBtn-${r.SDHNUM_0}`, // ID único por remito
                text: "Firmar",
                onClick: async () => {
                    const url = `/proxy-getrpt?PCLE=${encodeURIComponent(r.SDHNUM_0)}`;
                    try {
                        await recuperarDocumentoBase64ConReintentos(url);
                    }
                    catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                },
                style: { padding: "4px 8px" }
            });
        }
        // Volver a configurar los filtros después de renderizar
        this.setupColumnFilters();
        this.setupRowSelection(); // <<-- agregamos selección de fila
    }
    setupRowSelection() {
        const table = document.getElementById(this.tableId);
        if (!table)
            return;
        const tbody = table.tBodies[0];
        if (!tbody)
            return;
        Array.from(tbody.rows).forEach(row => {
            row.addEventListener("click", () => {
                // Quitar clase selected de otras filas
                tbody.querySelectorAll("tr.selected").forEach(r => r.classList.remove("selected"));
                // Marcar fila clickeada
                row.classList.add("selected");
                const company = row.dataset.company;
                const facility = row.dataset.facility;
                const remito = row.dataset.remito;
                if (company && facility && remito) {
                    this.remitoSeleccionado = { company, facility, remito };
                    console.log("Remito seleccionado:", this.remitoSeleccionado);
                }
            });
        });
    }
}
