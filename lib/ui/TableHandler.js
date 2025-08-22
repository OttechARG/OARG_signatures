import { createButton } from "./ButtonsHandler.js";
import { getReport } from "../core/ReportConfig.js";
export class TableHandler {
    constructor(tableId) {
        this.remitoSeleccionado = null;
        this.isProcessing = false; // Flag to prevent multiple simultaneous requests
        this.currentPagination = null; // Store current pagination info
        this.currentParams = null; // Store current search params
        this.lastFilterClickTime = 0; // Track last filter click time
        this.filterClickDelay = 2000; // 2 second delay between filter clicks
        this.filterTimeout = null; // Debounce timeout for text filters
        this.listenersSetup = false; // Track if listeners are already set up
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
        // Only setup listeners once to avoid duplicates that cause infinite loops
        if (this.listenersSetup)
            return;
        const table = document.getElementById(this.tableId);
        if (!table)
            return;
        const filterInputs = table.querySelectorAll('thead input.filter-input');
        const filterOptions = table.querySelectorAll('thead .firmado-filter-options');
        const applyServerSideFilters = () => {
            if (!this.currentParams)
                return;
            // Collect text filter values from current DOM state
            const currentFilterInputs = document.querySelectorAll('thead input.filter-input');
            const textFilters = {};
            currentFilterInputs.forEach(input => {
                const colIndex = Number(input.dataset.col);
                const value = input.value.trim();
                if (value) {
                    switch (colIndex) {
                        case 0:
                            textFilters.remito = value;
                            break;
                        case 1:
                            textFilters.fecha = value;
                            break;
                        case 2:
                            textFilters.codigo = value;
                            break;
                        case 3:
                            textFilters.razon = value;
                            break;
                    }
                }
            });
            // Get current firmado filter
            const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]');
            const selectedOption = filterContainer?.querySelector('.filter-option.selected');
            const firmadoFilter = selectedOption?.dataset.value || 'no-firmados';
            // Refresh data from server with filters
            this.refreshWithFilters(firmadoFilter, textFilters);
        };
        // Add debounced input listeners for text filters
        filterInputs.forEach(input => {
            input.addEventListener('input', () => {
                if (this.filterTimeout) {
                    clearTimeout(this.filterTimeout);
                }
                // Debounce text filter requests by 500ms
                this.filterTimeout = setTimeout(applyServerSideFilters, 500);
            });
        });
        // Setup filter option click handlers
        filterOptions.forEach(container => {
            const options = container.querySelectorAll('.filter-option');
            options.forEach(option => {
                option.addEventListener('click', () => {
                    // Debounce rapid filter clicks
                    const now = Date.now();
                    if (now - this.lastFilterClickTime < this.filterClickDelay) {
                        console.log('Filter click debounced - too soon after last click');
                        return;
                    }
                    this.lastFilterClickTime = now;
                    // Remove selected class from all options in this container
                    container.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
                    // Add selected class to clicked option
                    option.classList.add('selected');
                    // Get the filter value and refresh data from backend
                    const filterValue = option.dataset.value;
                    this.refreshWithFilter(filterValue || '');
                });
            });
        });
        // Setup refresh button
        const refreshBtn = document.getElementById('refreshTableBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshTableWithNoFirmados();
            });
        }
        // Mark listeners as setup to prevent duplicates
        this.listenersSetup = true;
    }
    async refreshTableWithNoFirmados() {
        try {
            // Get current selection from sessionStorage
            const savedSelection = sessionStorage.getItem("userSelection");
            if (!savedSelection) {
                alert("No se encontró selección. Por favor selecciona un puesto primero.");
                return;
            }
            const { company, facility } = JSON.parse(savedSelection);
            const fechaDesdeInput = document.getElementById("fechaDesde");
            const fechaDesde = fechaDesdeInput?.value || undefined;
            // Refresh table data
            const remitosHandler = window.remitosHandler;
            if (remitosHandler && company && facility) {
                // Store current params for pagination
                this.currentParams = { company, facility, fechaDesde };
                const pageSize = window.userPreferences?.getPageSize() || 50;
                // Get current filter value
                const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]');
                const selectedOption = filterContainer?.querySelector('.filter-option.selected');
                const currentFilter = selectedOption?.dataset.value || 'no-firmados'; // Default to no-firmados
                const result = await remitosHandler.fetchRemitos(company, facility, fechaDesde, 1, pageSize, currentFilter, {});
                await this.renderTable(result.remitos, result.pagination);
                // Ensure "No" filter is selected after refresh
                setTimeout(() => {
                    const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]');
                    if (filterContainer) {
                        // Remove selected class from all options
                        filterContainer.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
                        // Add selected class to "No" option
                        const noOption = filterContainer.querySelector('.filter-option[data-value="no-firmados"]');
                        if (noOption) {
                            noOption.classList.add('selected');
                        }
                    }
                }, 100);
                console.log('Table refreshed and filtered to show no firmados');
            }
        }
        catch (error) {
            console.error('Error al actualizar la tabla:', error);
            alert('Error al actualizar la tabla. Por favor inténtalo de nuevo.');
        }
    }
    async renderTable(remitos, pagination) {
        const tabla = document.getElementById(this.tableId);
        const tbody = tabla.querySelector('tbody');
        tbody.innerHTML = "";
        // Store pagination info
        if (pagination) {
            this.currentPagination = pagination;
            this.renderPaginationControls();
        }
        for (const r of remitos) {
            const tr = document.createElement('tr');
            tr.dataset.company = r.CPY_0 || r.CPY || "";
            tr.dataset.facility = r.STOFCY_0 || r.STOFAC || "";
            tr.dataset.remito = String(r.SDHNUM_0 || "");
            tr.style.cursor = "pointer";
            // Usar XX6FLSIGN_0 directamente: 1 = No firmado, 2 = Firmado
            const isSigned = r.XX6FLSIGN_0 === 2;
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
                        const report = await getReport();
                        const url = `/proxy-getrpt?PRPT=${report.remito}&POBJ=SDH&POBJORI=SDH&PCLE=${encodeURIComponent(r.SDHNUM_0)}&WSIGN=2&PIMPRIMANTE=WSPRINT`;
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
        // Apply default filter (No firmados) on initial render
        this.applyInitialFilter();
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
    renderPaginationControls() {
        if (!this.currentPagination)
            return;
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (!paginationContainer || !paginationInfo || !pageNumbers || !prevBtn || !nextBtn)
            return;
        // Show pagination container
        paginationContainer.style.display = 'block';
        // Update info
        const { currentPage, totalCount, pageSize, totalPages, hasNextPage, hasPreviousPage } = this.currentPagination;
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalCount);
        paginationInfo.textContent = `Mostrando ${start}-${end} de ${totalCount} registros`;
        // Update buttons
        prevBtn.disabled = !hasPreviousPage;
        nextBtn.disabled = !hasNextPage;
        // Generate page numbers
        pageNumbers.innerHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i.toString();
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.addEventListener('click', () => this.goToPage(i));
            pageNumbers.appendChild(pageBtn);
        }
        // Set up navigation button listeners (remove old ones first)
        prevBtn.replaceWith(prevBtn.cloneNode(true));
        nextBtn.replaceWith(nextBtn.cloneNode(true));
        const newPrevBtn = document.getElementById('prevPageBtn');
        const newNextBtn = document.getElementById('nextPageBtn');
        newPrevBtn.addEventListener('click', () => this.goToPage(currentPage - 1));
        newNextBtn.addEventListener('click', () => this.goToPage(currentPage + 1));
    }
    async goToPage(page) {
        if (!this.currentParams || !this.currentPagination)
            return;
        const pageSize = window.userPreferences?.getPageSize() || 50;
        // Get current firmado filter
        const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]');
        const selectedOption = filterContainer?.querySelector('.filter-option.selected');
        const currentFilter = selectedOption?.dataset.value || 'no-firmados';
        // Get current text filters
        const filterInputs = document.querySelectorAll('thead input.filter-input');
        const textFilters = {};
        filterInputs.forEach(input => {
            const colIndex = Number(input.dataset.col);
            const value = input.value.trim();
            if (value) {
                switch (colIndex) {
                    case 0:
                        textFilters.remito = value;
                        break;
                    case 1:
                        textFilters.fecha = value;
                        break;
                    case 2:
                        textFilters.codigo = value;
                        break;
                    case 3:
                        textFilters.razon = value;
                        break;
                }
            }
        });
        try {
            const remitosHandler = window.remitosHandler;
            if (remitosHandler) {
                const result = await remitosHandler.fetchRemitos(this.currentParams.company, this.currentParams.facility, this.currentParams.fechaDesde, page, pageSize, currentFilter, textFilters);
                await this.renderTable(result.remitos, result.pagination);
            }
        }
        catch (error) {
            console.error('Error al cambiar de página:', error);
        }
    }
    // Method to refresh current table with new page size
    async refreshWithPageSize(page = 1, pageSize) {
        if (!this.currentParams)
            return;
        // Get current firmado filter
        const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]');
        const selectedOption = filterContainer?.querySelector('.filter-option.selected');
        const currentFilter = selectedOption?.dataset.value || 'no-firmados';
        // Get current text filters
        const filterInputs = document.querySelectorAll('thead input.filter-input');
        const textFilters = {};
        filterInputs.forEach(input => {
            const colIndex = Number(input.dataset.col);
            const value = input.value.trim();
            if (value) {
                switch (colIndex) {
                    case 0:
                        textFilters.remito = value;
                        break;
                    case 1:
                        textFilters.fecha = value;
                        break;
                    case 2:
                        textFilters.codigo = value;
                        break;
                    case 3:
                        textFilters.razon = value;
                        break;
                }
            }
        });
        try {
            const remitosHandler = window.remitosHandler;
            if (remitosHandler) {
                const result = await remitosHandler.fetchRemitos(this.currentParams.company, this.currentParams.facility, this.currentParams.fechaDesde, page, pageSize, currentFilter, textFilters);
                await this.renderTable(result.remitos, result.pagination);
            }
        }
        catch (error) {
            console.error('Error al actualizar con el tamaño de página:', error);
        }
    }
    applyInitialFilter() {
        // No longer needed - filter is applied at backend level
        // This method is kept for compatibility but does nothing
    }
    // New method to refresh with filters (both firmado and text filters)
    async refreshWithFilters(firmadoFilter, textFilters) {
        if (!this.currentParams)
            return;
        try {
            const remitosHandler = window.remitosHandler;
            const pageSize = window.userPreferences?.getPageSize() || 50;
            if (remitosHandler) {
                const result = await remitosHandler.fetchRemitos(this.currentParams.company, this.currentParams.facility, this.currentParams.fechaDesde, 1, // Reset to page 1 when filter changes
                pageSize, firmadoFilter, textFilters);
                await this.renderTable(result.remitos, result.pagination);
            }
        }
        catch (error) {
            console.error('Error al actualizar con los filtros:', error);
        }
    }
    // Legacy method for compatibility - now uses the new method
    async refreshWithFilter(filterValue) {
        await this.refreshWithFilters(filterValue);
    }
}
