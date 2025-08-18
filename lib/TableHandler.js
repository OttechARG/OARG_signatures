import { createButton } from "./ButtonsHandler.js";
export class TableHandler {
    constructor(tableId) {
        this.remitoSeleccionado = null;
        this.isProcessing = false; // Flag to prevent multiple simultaneous requests
        this.tableId = tableId;
        // Reset processing flag when page loads (handles navigation back)
        this.isProcessing = false;
        // Add CSS animation for spinner
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
            document.head.appendChild(style);
        }
        // Reset flag when window gets focus (handles navigation back)
        window.addEventListener('focus', () => {
            this.isProcessing = false;
            this.resetAllButtons();
        });
        // Reset flag when page becomes visible (handles tab switching)
        window.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.isProcessing = false;
                this.resetAllButtons();
            }
        });
    }
    resetAllButtons() {
        // Reset all firmar buttons to their original state
        const buttons = document.querySelectorAll('button[id^="recuperarDocumentoBtn-"]');
        buttons.forEach(button => {
            button.innerHTML = '<img src="assets/Firmar.png" alt="Firmar" style="height: 35px; width: auto;">';
            button.disabled = false;
        });
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
        // Setup refresh button
        const refreshBtn = document.getElementById('refreshTableBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshTableWithNoFirmados();
            });
        }
    }
    async refreshTableWithNoFirmados() {
        try {
            // Get current selection from sessionStorage
            const savedSelection = sessionStorage.getItem("userSelection");
            if (!savedSelection) {
                alert("No selection found. Please select a puesto first.");
                return;
            }
            const { company, facility } = JSON.parse(savedSelection);
            const fechaDesdeInput = document.getElementById("fechaDesde");
            const fechaDesde = fechaDesdeInput?.value || undefined;
            // Refresh table data
            const remitosHandler = window.remitosHandler;
            if (remitosHandler && company && facility) {
                const remitos = await remitosHandler.fetchRemitos(company, facility, fechaDesde);
                await this.renderTable(remitos);
                // Set filter to "no-firmados" after refresh
                const filterSelect = document.querySelector('.filter-select[data-col="4"]');
                if (filterSelect) {
                    filterSelect.value = "no-firmados";
                    // Trigger the filter
                    filterSelect.dispatchEvent(new Event('change'));
                }
                console.log('Table refreshed and filtered to show no firmados');
            }
        }
        catch (error) {
            console.error('Error refreshing table:', error);
            alert('Error refreshing table. Please try again.');
        }
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
                        // Prevent multiple simultaneous requests
                        if (this.isProcessing)
                            return;
                        this.isProcessing = true;
                        // Show loading indicator on the button
                        const button = document.getElementById(`recuperarDocumentoBtn-${r.SDHNUM_0}`);
                        if (button) {
                            button.innerHTML = '<div style="width:20px;height:20px;border:2px solid #ccc;border-top:2px solid #000;border-radius:50%;animation:spin 1s linear infinite;margin:auto;"></div>';
                            button.disabled = true;
                        }
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
                        const url = `/proxy-getrpt?PRPT=ZREMITOAI&POBJ=SDH&POBJORI=SDH&PCLE=${encodeURIComponent(r.SDHNUM_0)}&WSIGN=2&PIMPRIMANTE=WSPRINT`;
                        try {
                            // Fetch JSON response with base64 PDF
                            const response = await fetch(url);
                            if (!response.ok) {
                                throw new Error(`Error: ${response.status} ${response.statusText}`);
                            }
                            const jsonResult = await response.json();
                            if (!jsonResult.success || !jsonResult.pdfBase64) {
                                throw new Error('PDF data not received from server');
                            }
                            // Store PDF data in sessionStorage for signing page
                            const pdfData = {
                                base64: jsonResult.pdfBase64,
                                filename: jsonResult.filename,
                                remito: r.SDHNUM_0,
                                coordinates: jsonResult.coordinates
                            };
                            sessionStorage.setItem('pdfToSign', JSON.stringify(pdfData));
                            // Navigate to signing page (flag will reset when page reloads)
                            window.location.href = `/firmar/${r.SDHNUM_0}`;
                        }
                        catch (error) {
                            // Reset flag and button on error
                            this.isProcessing = false;
                            const button = document.getElementById(`recuperarDocumentoBtn-${r.SDHNUM_0}`);
                            if (button) {
                                button.innerHTML = '<img src="assets/Firmar.png" alt="Firmar" style="height: 35px; width: auto;">';
                                button.disabled = false;
                            }
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
