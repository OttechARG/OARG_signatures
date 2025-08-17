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
        const filterSelects = table.querySelectorAll('thead select.filter-select');
        const applyFilters = () => {
            const textFilters = Array.from(filterInputs).map(i => ({
                colIndex: Number(i.dataset.col),
                value: i.value.toLowerCase().trim()
            }));
            const selectFilters = Array.from(filterSelects).map(s => ({
                colIndex: Number(s.dataset.col),
                value: s.value
            }));
            const tbody = table.tBodies[0];
            if (!tbody)
                return;
            Array.from(tbody.rows).forEach(row => {
                let visible = true;
                // Apply text filters
                for (const filter of textFilters) {
                    if (filter.value) {
                        const cellText = row.cells[filter.colIndex]?.textContent?.toLowerCase() || '';
                        if (!cellText.includes(filter.value)) {
                            visible = false;
                            break;
                        }
                    }
                }
                // Apply select filters (firmado column)
                if (visible) {
                    for (const filter of selectFilters) {
                        if (filter.value) {
                            const cell = row.cells[filter.colIndex];
                            const isSigned = cell?.classList.contains('signed-true');
                            if (filter.value === 'no-firmados' && isSigned) {
                                visible = false;
                                break;
                            }
                            else if (filter.value === 'si-firmados' && !isSigned) {
                                visible = false;
                                break;
                            }
                        }
                    }
                }
                row.style.display = visible ? '' : 'none';
            });
        };
        filterInputs.forEach(input => {
            input.addEventListener('input', applyFilters);
        });
        filterSelects.forEach(select => {
            select.addEventListener('change', applyFilters);
        });
    }
    async renderTable(remitos) {
        const tabla = document.getElementById(this.tableId);
        const tbody = tabla.querySelector('tbody');
        tbody.innerHTML = "";
        // --- Obtener PDFs firmados desde GraphQL ---
        const signedKeys = await fetch("/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: `{ signedPdfs }` }),
        })
            .then(res => res.json())
            .then(res => res.data?.signedPdfs || []); // si es null o undefined, devuelve array vacío
        for (const r of remitos) {
            const tr = document.createElement('tr');
            tr.dataset.company = r.CPY_0 || r.CPY || "";
            tr.dataset.facility = r.STOFCY_0 || r.STOFAC || "";
            tr.dataset.remito = String(r.SDHNUM_0 || "");
            tr.style.cursor = "pointer";
            const key = `${r.CPY_0 || r.CPY || ""}-${r.STOFCY_0 || r.STOFAC || ""}-${r.SDHNUM_0 || ""}`;
            const isSigned = signedKeys.includes(key);
            tr.innerHTML = `
        <td>${r.SDHNUM_0 || ""}</td>
        <td>${r.DLVDAT_0 || ""}</td>
        <td>${r.BPCORD_0 || ""}</td>
        <td>${r.BPDNAM_0 || ""}</td>
        <td class="firmado-column ${isSigned ? 'signed-true' : 'signed-false'}">
            <span class="status-indicator">${isSigned ? '✓' : '✗'}</span>
            <span class="button-container"></span>
        </td>
      `;
            tbody.appendChild(tr);
            const tdBoton = tr.querySelector(".button-container");
            if (!isSigned) {
                createButton(tdBoton, {
                    id: `recuperarDocumentoBtn-${r.SDHNUM_0}`,
                    html: '<img src="assets/Firmar.png" alt="Firmar" style="height: 35px; width: auto;">',
                    style: {
                        background: 'none',
                        border: 'none',
                        padding: '0',
                        cursor: 'pointer'
                    },
                    onClick: async () => {
                        // Guardar datos del remito en sessionStorage para uso posterior
                        const remitoData = {
                            cpy: r.CPY_0 || "",
                            stofcy: r.STOFCY_0 || r.STOFAC || "",
                            sdhnum: r.SDHNUM_0 || "",
                            dlvdat: r.DLVDAT_0 || "",
                            bpcord: r.BPCORD_0 || "",
                            bpdnam: r.BPDNAM_0 || ""
                        };
                        sessionStorage.setItem('currentRemito', JSON.stringify(remitoData));
                        console.log("Datos del remito guardados:", remitoData);
                        const url = `/proxy-getrpt?PCLE=${encodeURIComponent(r.SDHNUM_0)}`;
                        try {
                            await recuperarDocumentoBase64ConReintentos(url);
                            // --- Marcar como firmado en GraphQL ---
                            await fetch("/graphql", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    query: `mutation($key: String!) { signPdf(key: $key) }`,
                                    variables: { key }
                                }),
                            });
                            // Actualizar visualmente
                            const firmadoCell = tr.querySelector("td.firmado-column");
                            const statusIndicator = firmadoCell.querySelector(".status-indicator");
                            const buttonContainer = firmadoCell.querySelector(".button-container");
                            statusIndicator.textContent = "✓";
                            firmadoCell.className = "firmado-column signed-true";
                            buttonContainer.innerHTML = "";
                        }
                        catch (error) {
                            console.error(error);
                            alert(error.message);
                        }
                    }
                });
            }
        }
        this.setupColumnFilters();
        this.setupRowSelection();
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
                tbody.querySelectorAll("tr.selected").forEach(r => r.classList.remove("selected"));
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
