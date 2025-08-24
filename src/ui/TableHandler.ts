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
  private columns: any[] = []; // Dynamic columns from config
  private currentTextFilters: Record<string, string> = {}; // Store all current text filters
  private focusState: { col: string; position: number } | null = null; // Store focus state
  private forceHeaderRegeneration = false; // Flag to force header regeneration

  constructor(tableId: string) {
    this.tableId = tableId;
    // Reset processing flag when page loads (handles navigation back)
    this.isProcessing = false;
    
    // On page load/refresh, always default to "No firmados"
    this.currentFirmadoFilter = 'no-firmados';
    this.currentTextFilters = {};
    
    // Initialize with saved configuration even when empty
    this.initializeWithSavedConfig();
    
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

  private async loadTableConfig(): Promise<void> {
    // NO CONFIG - Table columns come purely from SQL query
    console.log("🚫 loadTableConfig() called but ignoring - using SQL columns only");
  }

  private async waitForConfigManagerAndApply(dynamicColumns: string[]): Promise<void> {
    const maxAttempts = 20; // 2 seconds max wait
    let attempts = 0;
    
    return new Promise<void>((resolve) => {
      const checkAndApply = () => {
        attempts++;
        const manager = (window as any).clientTableConfigManager;
        
        if (manager && manager.getMergedConfig()) {
          console.log("🎯 Using ClientTableConfigManager with saved configuration");
          manager.updateConfigWithSqlColumns(dynamicColumns);
          // Get filtered columns (only visible ones) 
          this.columns = manager.getVisibleColumnsFilteredBySql(dynamicColumns);
          console.log("📋 Applied configured columns:", this.columns);
          resolve();
          return;
        }
        
        if (attempts < maxAttempts) {
          setTimeout(checkAndApply, 100);
        } else {
          console.log("⚠️ ClientTableConfigManager timeout, using fallback");
          // Fallback: use direct mapping
          this.columns = dynamicColumns.map(field => ({
            field,
            ...this.getColumnConfig(field)
          }));
          resolve();
        }
      };
      
      checkAndApply();
    });
  }

  private async initializeWithSavedConfig(): Promise<void> {
    // Wait for ClientTableConfigManager to be ready, then show saved column structure
    setTimeout(async () => {
      const manager = (window as any).clientTableConfigManager;
      if (manager && manager.getMergedConfig()) {
        const savedColumns = manager.getAllVisibleColumns();
        if (savedColumns && savedColumns.length > 0) {
          console.log("🎨 Showing saved column configuration on empty table:", savedColumns);
          this.columns = savedColumns;
          this.generateTableHeaders();
          this.setupColumnFilters();
        }
      }
    }, 200); // Small delay to ensure ClientTableConfigManager is loaded
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
      
      // Update persistent text filters storage from current DOM state
      const currentFilterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
      
      currentFilterInputs.forEach(input => {
        const colIndex = Number(input.dataset.col);
        const value = input.value.trim();
        if (this.columns[colIndex]) {
          const fieldName = this.columns[colIndex].field;
          if (value) {
            this.currentTextFilters[fieldName] = value;
          } else {
            // Remove empty filters
            delete this.currentTextFilters[fieldName];
          }
        }
      });

      console.log('🔍 Text filter applied - combining with firmado filter:', this.currentFirmadoFilter, 'textFilters:', this.currentTextFilters);
      
      // Refresh data from server with combined filters
      this.refreshWithFilters(this.currentFirmadoFilter, this.currentTextFilters);
    };

    // Add debounced input listeners for text filters
    filterInputs.forEach(input => {
      input.addEventListener('input', () => {
        if (this.filterTimeout) {
          clearTimeout(this.filterTimeout);
        }
        // Store focus state persistently
        const focusedElement = document.activeElement as HTMLInputElement;
        const focusedCol = focusedElement?.dataset?.col;
        const cursorPosition = focusedElement?.selectionStart || 0;
        
        if (focusedCol) {
          this.focusState = { col: focusedCol, position: cursorPosition };
          console.log('🎯 Stored focus state:', this.focusState);
        }
        
        // Debounce text filter requests by 500ms
        this.filterTimeout = setTimeout(() => {
          console.log('🔄 Applying filters...');
          applyServerSideFilters();
        }, 500);
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
          
          // Use persistent text filters (they're always up to date)
          const textFilters = { ...this.currentTextFilters };
          
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
        // FORCE default filter for refresh button - always reset to "No firmados"
        const currentFilter = 'no-firmados';
        this.currentFirmadoFilter = currentFilter; // Force reset to default
        this.currentTextFilters = {}; // Also clear text filters on refresh
        console.log('🏠 Refresh button - Force reset to default filter:', currentFilter);
        
        const result = await remitosHandler.fetchRemitos(company, facility, fechaDesde, 1, pageSize, currentFilter, {});
        // Force header regeneration on refresh to reset filter UI
        this.forceHeaderRegeneration = true;
        await this.renderTable(result.remitos, result.pagination, result.columns);
        
        console.log('Table refreshed and reset to no firmados');
      }
    } catch (error) {
      console.error('Error al actualizar la tabla:', error);
      alert('Error al actualizar la tabla. Por favor inténtalo de nuevo.');
    }
  }

  private generateTableHeaders(): void {
    const tabla = document.getElementById(this.tableId) as HTMLTableElement;
    const thead = tabla.querySelector('thead');
    if (!thead) return;

    // Filter values are stored in this.currentTextFilters, no need to save from DOM

    // Clear existing headers and reset listener flag since we're creating new DOM elements
    thead.innerHTML = '';
    this.listenersSetup = false;

    // Create main header row (with column names)
    const headerRow = document.createElement('tr');
    
    this.columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);

    // Create filter row (matching original CSS structure)
    const filterRow = document.createElement('tr');
    filterRow.id = 'filterRow'; // Important: matches original CSS selector

    this.columns.forEach((column, index) => {
      const th = document.createElement('th');
      
      if (column.filterable) {
        if (column.filterType === 'select' && column.filterOptions) {
          // Select-type filter (like Firmado column) - preserve original structure
          const filterCellContent = document.createElement('div');
          filterCellContent.className = 'filter-cell-content';
          
          const filterOptionsContainer = document.createElement('div');
          filterOptionsContainer.className = 'firmado-filter-options';
          filterOptionsContainer.dataset.col = index.toString();
          
          column.filterOptions.forEach((option: any) => {
            const optionEl = document.createElement('span');
            optionEl.className = 'filter-option';
            optionEl.dataset.value = option.value;
            optionEl.textContent = option.label;
            // Set selected state based on current filter, not default
            if (option.value === this.currentFirmadoFilter) {
              optionEl.classList.add('selected');
            }
            filterOptionsContainer.appendChild(optionEl);
          });
          
          // Add refresh button to the Firmado column
          const refreshBtn = document.createElement('button');
          refreshBtn.id = 'refreshTableBtn';
          refreshBtn.className = 'refresh-btn';
          refreshBtn.type = 'button';
          refreshBtn.innerHTML = '<img src="assets/Refresh.png" alt="Refresh" class="refresh-icon">';
          
          filterCellContent.appendChild(filterOptionsContainer);
          filterCellContent.appendChild(refreshBtn);
          th.appendChild(filterCellContent);
        } else {
          // Text input filter - preserve original structure and classes
          const filterInput = document.createElement('input');
          filterInput.type = 'text';
          filterInput.className = 'filter-input'; // Original CSS class
          filterInput.dataset.col = index.toString();
          filterInput.placeholder = `Filtrar ${column.label}...`;
          th.appendChild(filterInput);
        }
      }
      
      filterRow.appendChild(th);
    });

    thead.appendChild(filterRow);

    // Restore filter values from persistent storage
    this.columns.forEach((column, index) => {
      if (this.currentTextFilters[column.field]) {
        const input = thead.querySelector<HTMLInputElement>(`input.filter-input[data-col="${index}"]`);
        if (input) {
          input.value = this.currentTextFilters[column.field];
        }
      }
    });

    // Restore focus state if needed
    if (this.focusState) {
      setTimeout(() => {
        const inputToFocus = thead.querySelector<HTMLInputElement>(`input.filter-input[data-col="${this.focusState!.col}"]`);
        if (inputToFocus) {
          console.log('🔄 Restoring focus to col:', this.focusState!.col);
          inputToFocus.focus();
          setTimeout(() => {
            inputToFocus.setSelectionRange(this.focusState!.position, this.focusState!.position);
            // Clear focus state after restoration
            this.focusState = null;
          }, 10);
        }
      }, 100);
    }
  }

  // Mapping from database column names to nice labels and config
  private getColumnConfig(field: string) {
    const columnMappings: { [key: string]: any } = {
      'SDHNUM_0': { label: 'Remito', filterable: true, filterType: 'text' },
      'DLVDAT_0': { label: 'Fecha', filterable: true, filterType: 'text' },
      'BPCORD_0': { label: 'Código', filterable: true, filterType: 'text' },
      'BPDNAM_0': { label: 'Razón', filterable: true, filterType: 'text' },
      'CPY_0': { label: 'CPY_0', filterable: true, filterType: 'text' },
      'STOFCY_0': { label: 'STOFCY_0', filterable: true, filterType: 'text' },
      'XX6FLSIGN_0': { 
        label: 'Firmado', 
        filterable: true, 
        filterType: 'select',
        filterOptions: [
          { value: 'no-firmados', label: 'No' },
          { value: 'si-firmados', label: 'Sí' },
          { value: '', label: 'Todos' }
        ]
      }
    };

    return columnMappings[field] || { 
      label: field, // Fallback to field name if not mapped
      filterable: true, 
      filterType: 'text' 
    };
  }

  public async renderTable(remitos: any[], pagination?: any, dynamicColumns?: string[]): Promise<void> {
    // ALWAYS use SQL columns directly - but map to nice labels and config
    if (dynamicColumns && dynamicColumns.length > 0) {
      
      // Wait for ClientTableConfigManager and apply saved configuration
      await this.waitForConfigManagerAndApply(dynamicColumns);
      
      console.log("🔥 USING SQL COLUMNS WITH VISIBILITY CONTROL:", this.columns);
    } else {
      // If no SQL columns, don't render anything - wait for proper data
      console.log("⚠️ NO SQL COLUMNS - WAITING FOR DATA, NOT RENDERING TABLE");
      return; // Exit early, don't render empty table
    }
    
    const tabla = document.getElementById(this.tableId) as HTMLTableElement;
    
    // Only generate headers if they don't exist, columns changed, or forced
    const thead = tabla.querySelector('thead');
    const existingHeaders = thead?.querySelectorAll('th');
    const needsHeaderUpdate = !existingHeaders || existingHeaders.length !== this.columns.length || this.forceHeaderRegeneration;
    
    if (needsHeaderUpdate) {
      console.log('🔄 Regenerating headers - needed:', { 
        noHeaders: !existingHeaders, 
        countChanged: existingHeaders?.length !== this.columns.length,
        forced: this.forceHeaderRegeneration 
      });
      this.generateTableHeaders();
      this.forceHeaderRegeneration = false; // Reset flag after use
    } else {
      console.log('✅ Keeping existing headers - just updating data');
    }
    
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

      // Check if signed first (needed for button logic)
      const isSigned = r.XX6FLSIGN_0 === 2;
      
      // Generate table cells dynamically based on column configuration
      let rowHTML = '';
      this.columns.forEach(column => {
        const value = r[column.field] || "";
        
        if (column.field === 'XX6FLSIGN_0') {
          // Special handling for firmado column
          rowHTML += `<td class="firmado-column ${isSigned ? 'signed-true' : 'signed-false'}">
            <span class="status-indicator">${isSigned ? '✓' : '✗'}</span>
            <span class="button-container"></span>
          </td>`;
        } else {
          // Regular column
          rowHTML += `<td>${value}</td>`;
        }
      });
      
      tr.innerHTML = rowHTML;
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
    
    // Use persistent text filters
    const textFilters = { ...this.currentTextFilters };
    
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
        await this.renderTable(result.remitos, result.pagination, result.columns);
        
        // Restore filter button state after re-render
        setTimeout(() => {
          // Find the firmado column dynamically
          const firmadoColumnIndex = this.columns.findIndex(col => col.field === 'XX6FLSIGN_0');
          const newFilterContainer = document.querySelector(`.firmado-filter-options[data-col="${firmadoColumnIndex}"]`) as HTMLElement;
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
    
    // Get current firmado filter dynamically
    const firmadoColumnIndex = this.columns.findIndex(col => col.field === 'XX6FLSIGN_0');
    const filterContainer = document.querySelector(`.firmado-filter-options[data-col="${firmadoColumnIndex}"]`) as HTMLElement;
    const selectedOption = filterContainer?.querySelector('.filter-option.selected') as HTMLElement;
    const currentFilter = selectedOption?.dataset.value || 'no-firmados';
    
    // Use persistent text filters
    const textFilters = { ...this.currentTextFilters };
    
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
        await this.renderTable(result.remitos, result.pagination, result.columns);
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
  public async refreshWithFilters(firmadoFilter: string, textFilters?: Record<string, string>): Promise<void> {
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
        await this.renderTable(result.remitos, result.pagination, result.columns);
      }
    } catch (error) {
      console.error('Error al actualizar con los filtros:', error);
    }
  }

  // Legacy method for compatibility - now uses the new method
  public async refreshWithFilter(filterValue: string): Promise<void> {
    await this.refreshWithFilters(filterValue);
  }

  // Method to clear all text filters
  public clearTextFilters(): void {
    this.currentTextFilters = {};
    // Clear the input values in DOM as well
    const filterInputs = document.querySelectorAll<HTMLInputElement>('thead input.filter-input');
    filterInputs.forEach(input => {
      input.value = '';
    });
  }

  // Method to refresh table configuration and re-render
  public async refreshTableConfig(): Promise<void> {
    await this.loadTableConfig();
    
    // Re-render the table with new configuration if we have current data
    if (this.currentParams) {
      const remitosHandler = (window as any).remitosHandler;
      if (remitosHandler) {
        const pageSize = (window as any).userPreferences?.getPageSize() || 50;
        const result = await remitosHandler.fetchRemitos(
          this.currentParams.company,
          this.currentParams.facility,
          this.currentParams.fechaDesde,
          1,
          pageSize,
          this.currentFirmadoFilter,
          {}
        );
        await this.renderTable(result.remitos, result.pagination, result.columns);
      }
    }
  }
}
