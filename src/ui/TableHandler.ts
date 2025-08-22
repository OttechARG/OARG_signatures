import { createButton } from "./ButtonsHandler.js";
import { getDocumentBase64WithRetries } from "../pdf/PDFHandler.js";
import { getReport } from "../core/ReportConfig.js";

export class TableHandler {
  private tableId: string;
  public remitoSeleccionado: { company: string; facility: string; remito: string } | null = null;
  private isProcessing = false; // Flag to prevent multiple simultaneous requests
  private currentPagination: any = null; // Store current pagination info
  public currentParams: any = null; // Store current search params
  private lastFilterClickTime: number = 0; // Track last filter click time
  private filterClickDelay: number = 2000; // 2 second delay between filter clicks
  private filterTimeout: NodeJS.Timeout | null = null; // Debounce timeout for text filters
  private listenersSetup = false; // Track if listeners are already set up
  private currentFirmadoFilter: string = 'no-firmados'; // Track current firmado filter state

  constructor(tableId: string) {
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

  private resetAllButtons(): void {
    // Reset all firmar buttons to their original state
    const buttons = document.querySelectorAll('button[id^="recuperarDocumentoBtn-"]') as NodeListOf<HTMLButtonElement>;
    buttons.forEach(button => {
      button.innerHTML = '<img src="assets/Firmar.png" alt="Firmar" style="height: 35px; width: auto;">';
      button.disabled = false;
    });
  }

  public setupColumnFilters(): void {
    // Only setup listeners once to avoid duplicates that cause infinite loops
    if (this.listenersSetup) return;
    
    const table = document.getElementById(this.tableId) as HTMLTableElement;
    if (!table) return;

    const filterInputs = table.querySelectorAll<HTMLInputElement>('thead input.filter-input');
    const filterOptions = table.querySelectorAll<HTMLElement>('thead .firmado-filter-options');

    const applyServerSideFilters = () => {
      if (!this.currentParams) return;
      
      // Collect text filter values from current DOM state
      const currentFilterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
      const textFilters: { remito?: string, fecha?: string, codigo?: string, razon?: string } = {};
      
      currentFilterInputs.forEach(input => {
        const colIndex = Number(input.dataset.col);
        const value = input.value.trim();
        if (value) {
          switch (colIndex) {
            case 0: textFilters.remito = value; break;
            case 1: textFilters.fecha = value; break;
            case 2: textFilters.codigo = value; break;
            case 3: textFilters.razon = value; break;
          }
        }
      });

      // Use stored firmado filter instead of reading from DOM
      const firmadoFilter = this.currentFirmadoFilter;

      console.log('🔍 Text filter applied - combining with firmado filter:', firmadoFilter, 'textFilters:', textFilters);
      
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
          
          // Get the filter value and store it
          const filterValue = (option as HTMLElement).dataset.value || '';
          this.currentFirmadoFilter = filterValue; // Store current filter
          
          // Collect current text filters from input fields
          const currentFilterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
          const textFilters: { remito?: string, fecha?: string, codigo?: string, razon?: string } = {};
          
          currentFilterInputs.forEach(input => {
            const colIndex = Number(input.dataset.col);
            const value = input.value.trim();
            if (value) {
              switch (colIndex) {
                case 0: textFilters.remito = value; break;
                case 1: textFilters.fecha = value; break;
                case 2: textFilters.codigo = value; break;
                case 3: textFilters.razon = value; break;
              }
            }
          });
          
          console.log('🎯 Filter clicked, stored:', filterValue, 'preserving text filters:', textFilters);
          this.refreshWithFilters(filterValue, textFilters);
        });
      });
    });

    // Setup refresh button
    const refreshBtn = document.getElementById('refreshTableBtn') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshTableWithNoFirmados();
      });
    }
    
    // Mark listeners as setup to prevent duplicates
    this.listenersSetup = true;
  }

  private async refreshTableWithNoFirmados(): Promise<void> {
    try {
      // Get current selection from sessionStorage
      const savedSelection = sessionStorage.getItem("userSelection");
      if (!savedSelection) {
        alert("No se encontró selección. Por favor selecciona un puesto primero.");
        return;
      }

      const { company, facility } = JSON.parse(savedSelection);
      const fechaDesdeInput = document.getElementById("fechaDesde") as HTMLInputElement;
      const fechaDesde = fechaDesdeInput?.value || undefined;

      // Refresh table data
      const remitosHandler = (window as any).remitosHandler;
      if (remitosHandler && company && facility) {
        // Store current params for pagination
        this.currentParams = { company, facility, fechaDesde };
        
        const pageSize = (window as any).userPreferences?.getPageSize() || 50;
        // Use default filter for initial load/refresh
        const currentFilter = 'no-firmados';
        this.currentFirmadoFilter = currentFilter; // Store default filter
        console.log('🏠 Initial load - Using default filter:', currentFilter);
        
        const result = await remitosHandler.fetchRemitos(company, facility, fechaDesde, 1, pageSize, currentFilter, {});
        await this.renderTable(result.remitos, result.pagination);
        
        // Keep current filter selection after refresh (don't force "no-firmados")
        
        console.log('Table refreshed and filtered to show no firmados');
      }
    } catch (error) {
      console.error('Error al actualizar la tabla:', error);
      alert('Error al actualizar la tabla. Por favor inténtalo de nuevo.');
    }
  }

  public async renderTable(remitos: any[], pagination?: any): Promise<void> {
    const tabla = document.getElementById(this.tableId) as HTMLTableElement;
    const tbody = tabla.querySelector('tbody')!;
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

      const tdBoton = tr.querySelector(".button-container") as HTMLElement;
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
            if (this.isProcessing) return;
            this.isProcessing = true;

            // Show loading indicator on the button
            const button = document.getElementById(`recuperarDocumentoBtn-${r.SDHNUM_0}`) as HTMLButtonElement;
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

            } catch (error) {
              // Reset flag and button on error
              this.isProcessing = false;
              const button = document.getElementById(`recuperarDocumentoBtn-${r.SDHNUM_0}`) as HTMLButtonElement;
              if (button) {
                button.innerHTML = '<img src="assets/Firmar.png" alt="Firmar" style="height: 35px; width: auto;">';
                button.disabled = false;
              }
              console.error(error);
              alert((error as Error).message);
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

  private setupRowSelection(): void {
    const table = document.getElementById(this.tableId) as HTMLTableElement;
    if (!table) return;

    const tbody = table.tBodies[0];
    if (!tbody) return;

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

  private renderPaginationControls(): void {
    if (!this.currentPagination) return;

    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPageBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextPageBtn') as HTMLButtonElement;

    if (!paginationContainer || !paginationInfo || !pageNumbers || !prevBtn || !nextBtn) return;

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
    
    const newPrevBtn = document.getElementById('prevPageBtn') as HTMLButtonElement;
    const newNextBtn = document.getElementById('nextPageBtn') as HTMLButtonElement;
    
    newPrevBtn.addEventListener('click', () => this.goToPage(currentPage - 1));
    newNextBtn.addEventListener('click', () => this.goToPage(currentPage + 1));
  }

  private async goToPage(page: number): Promise<void> {
    if (!this.currentParams || !this.currentPagination) return;
    
    const pageSize = (window as any).userPreferences?.getPageSize() || 50;
    
    // Use stored filter state instead of reading from DOM
    const currentFilter = this.currentFirmadoFilter;
    
    console.log('🔄 goToPage - Using stored filter:', currentFilter);
    
    // Get current text filters
    const filterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
    const textFilters: { remito?: string, fecha?: string, codigo?: string, razon?: string } = {};
    
    filterInputs.forEach(input => {
      const colIndex = Number(input.dataset.col);
      const value = input.value.trim();
      if (value) {
        switch (colIndex) {
          case 0: textFilters.remito = value; break;
          case 1: textFilters.fecha = value; break;
          case 2: textFilters.codigo = value; break;
          case 3: textFilters.razon = value; break;
        }
      }
    });
    
    try {
      const remitosHandler = (window as any).remitosHandler;
      if (remitosHandler) {
        const result = await remitosHandler.fetchRemitos(
          this.currentParams.company,
          this.currentParams.facility,
          this.currentParams.fechaDesde,
          page,
          pageSize,
          currentFilter,
          textFilters
        );
        await this.renderTable(result.remitos, result.pagination);
        
        // Restore filter button state after re-render
        setTimeout(() => {
          const newFilterContainer = document.querySelector('.firmado-filter-options[data-col="4"]') as HTMLElement;
          if (newFilterContainer) {
            // Remove all selected classes
            newFilterContainer.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
            // Add selected class to the stored filter
            const correctOption = newFilterContainer.querySelector(`.filter-option[data-value="${this.currentFirmadoFilter}"]`) as HTMLElement;
            if (correctOption) {
              correctOption.classList.add('selected');
              console.log('✅ Filter state restored to:', this.currentFirmadoFilter);
            }
          }
        }, 50);
      }
    } catch (error) {
      console.error('Error al cambiar de página:', error);
    }
  }

  // Method to refresh current table with new page size
  public async refreshWithPageSize(page: number = 1, pageSize: number): Promise<void> {
    if (!this.currentParams) return;
    
    // Get current firmado filter
    const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]') as HTMLElement;
    const selectedOption = filterContainer?.querySelector('.filter-option.selected') as HTMLElement;
    const currentFilter = selectedOption?.dataset.value || 'no-firmados';
    
    // Get current text filters
    const filterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
    const textFilters: { remito?: string, fecha?: string, codigo?: string, razon?: string } = {};
    
    filterInputs.forEach(input => {
      const colIndex = Number(input.dataset.col);
      const value = input.value.trim();
      if (value) {
        switch (colIndex) {
          case 0: textFilters.remito = value; break;
          case 1: textFilters.fecha = value; break;
          case 2: textFilters.codigo = value; break;
          case 3: textFilters.razon = value; break;
        }
      }
    });
    
    try {
      const remitosHandler = (window as any).remitosHandler;
      if (remitosHandler) {
        const result = await remitosHandler.fetchRemitos(
          this.currentParams.company,
          this.currentParams.facility,
          this.currentParams.fechaDesde,
          page,
          pageSize,
          currentFilter,
          textFilters
        );
        await this.renderTable(result.remitos, result.pagination);
      }
    } catch (error) {
      console.error('Error al actualizar con el tamaño de página:', error);
    }
  }

  private applyInitialFilter(): void {
    // No longer needed - filter is applied at backend level
    // This method is kept for compatibility but does nothing
  }

  // New method to refresh with filters (both firmado and text filters)
  public async refreshWithFilters(firmadoFilter: string, textFilters?: { remito?: string, fecha?: string, codigo?: string, razon?: string }): Promise<void> {
    if (!this.currentParams) return;
    
    try {
      const remitosHandler = (window as any).remitosHandler;
      const pageSize = (window as any).userPreferences?.getPageSize() || 50;
      
      if (remitosHandler) {
        const result = await remitosHandler.fetchRemitos(
          this.currentParams.company,
          this.currentParams.facility,
          this.currentParams.fechaDesde,
          1, // Reset to page 1 when filter changes
          pageSize,
          firmadoFilter,
          textFilters
        );
        await this.renderTable(result.remitos, result.pagination);
      }
    } catch (error) {
      console.error('Error al actualizar con los filtros:', error);
    }
  }

  // Legacy method for compatibility - now uses the new method
  public async refreshWithFilter(filterValue: string): Promise<void> {
    await this.refreshWithFilters(filterValue);
  }
}
