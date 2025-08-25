interface DbColumn {
  field: string;
  label: string;
  type: string;
  width: string;
  visible: boolean;
  position: number;
  filterable: boolean;
  filterType: string;
  filterOptions?: FilterOption[];
  sortable: boolean;
}

interface CustomColumn {
  id: string;
  label: string;
  type: string;
  width: string;
  visible: boolean;
  position: number;
  filterable: boolean;
  filterType?: string;
  filterOptions?: FilterOption[];
  options?: string[];
  defaultValue?: string;
  maxLength?: number;
}

interface FilterOption {
  value: string;
  label: string;
}

interface TableSettings {
  defaultPageSize?: number;
  allowPagination?: boolean;
  defaultSort?: {
    field: string;
    direction: string;
  };
}

interface StandardConfig {
  version: string;
  client: string;
  lastModified: string;
  table: {
    dbColumns: DbColumn[];
    settings: TableSettings;
  };
}

interface SpecificConfig {
  version: string;
  client: string;
  lastModified: string;
  table: {
    customColumns: CustomColumn[];
    columnOverrides: { [key: string]: Partial<DbColumn> };
    customFilters: any[];
    settings: Partial<TableSettings>;
  };
}

interface MergedConfig {
  dbColumns: DbColumn[];
  customColumns: CustomColumn[];
  settings: TableSettings;
}

class ClientTableConfigManager {
  private standardConfig: StandardConfig | null = null;
  private specificConfig: SpecificConfig | null = null;
  private mergedConfig: MergedConfig | null = null;
  private draggedElement: HTMLElement | null = null; // Global drag state

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadConfigurations();
    this.attachEventListeners();
  }

  private async loadConfigurations(): Promise<void> {
    try {
      // Load standard configuration
      const standardResponse = await fetch('/api/config/table-defaults');
      if (standardResponse.ok) {
        this.standardConfig = await standardResponse.json();
      } else {
        console.error('Error al cargar la configuración estándar');
      }

      // Load specific configuration  
      const specificResponse = await fetch('/api/config/table-customizations');
      if (specificResponse.ok) {
        this.specificConfig = await specificResponse.json();
      } else {
        console.error('Error al cargar la configuración específica');
      }

      // Merge configurations
      this.mergeConfigurations();
    } catch (error) {
      console.error('Error al cargar las configuraciones:', error);
    }
  }

  private mergeConfigurations(): void {
    if (!this.standardConfig || !this.specificConfig) return;

    // Start with standard DB columns
    let dbColumns = [...this.standardConfig.table.dbColumns];

    // Apply column overrides from specific config
    dbColumns = dbColumns.map(col => {
      const override = this.specificConfig!.table.columnOverrides[col.field];
      return override ? { ...col, ...override } : col;
    });

    // Sort columns by position
    dbColumns.sort((a, b) => a.position - b.position);

    // Get custom columns and sort by position
    const customColumns = [...this.specificConfig.table.customColumns];
    customColumns.sort((a, b) => a.position - b.position);

    // Merge settings
    const settings = {
      ...this.standardConfig.table.settings,
      ...this.specificConfig.table.settings
    };

    this.mergedConfig = {
      dbColumns,
      customColumns,
      settings
    };
  }

  private attachEventListeners(): void {
    // Open table config modal
    const openTableConfig = document.getElementById('openTableConfig');
    if (openTableConfig) {
      openTableConfig.addEventListener('click', () => {
        this.openConfigModal();
      });
    }
  }

  private openConfigModal(): void {
    // Create modal if it doesn't exist
    let modal = document.getElementById('tableConfigModal');
    if (!modal) {
      this.createConfigModal();
      modal = document.getElementById('tableConfigModal');
    }

    if (modal) {
      modal.classList.add('active');
      this.populateModalData();
    }
  }

  private createConfigModal(): void {
    // Add CSS styles for drag & drop
    this.addDragDropStyles();
    
    const modalHTML = `
      <div id="tableConfigModal" class="modal table-config-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Configuración de Tabla</h2>
            <button id="closeTableConfig" class="close-btn">×</button>
          </div>
          
          <div class="modal-body">
            <div class="tabs">
              <button class="tab-btn active" data-tab="columns">Columnas Actuales</button>
              <button class="tab-btn" data-tab="custom">Columnas Personalizadas</button>
              <button class="tab-btn" data-tab="filters">Filtros</button>
            </div>
            
            <!-- Current Columns Tab -->
            <div id="columnsTab" class="tab-content active">
              <div class="columns-list" id="dbColumnsList">
                <!-- Dynamic content -->
              </div>
            </div>
            
            <!-- Custom Columns Tab -->
            <div id="customTab" class="tab-content">
              <h3>Columnas Personalizadas</h3>
              <div class="custom-columns-list" id="customColumnsList">
                <!-- Dynamic content -->
              </div>
              <div class="add-column-section">
                <h4>Agregar Nueva Columna</h4>
                <div class="form-row">
                  <input type="text" id="newColumnLabel" placeholder="Nombre de columna">
                  <select id="newColumnType">
                    <option value="text">Texto</option>
                    <option value="select">Lista</option>
                    <option value="date">Fecha</option>
                    <option value="number">Número</option>
                  </select>
                  <button id="addCustomColumn">Agregar</button>
                </div>
              </div>
            </div>
            
            <!-- Filters Tab -->
            <div id="filtersTab" class="tab-content">
              <h3>Configuración de Filtros</h3>
              <div id="filtersConfigList">
                <!-- Dynamic content -->
              </div>
            </div>
            
          </div>
          
          <div class="modal-footer">
            <button id="saveTableConfig" class="btn-primary">Guardar Cambios</button>
            <button id="cancelTableConfig" class="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.attachModalEventListeners();
  }

  private attachModalEventListeners(): void {
    // Close modal
    const closeBtn = document.getElementById('closeTableConfig');
    const cancelBtn = document.getElementById('cancelTableConfig');
    const modal = document.getElementById('tableConfigModal');

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const tabName = target.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // Add custom column
    const addCustomBtn = document.getElementById('addCustomColumn');
    if (addCustomBtn) {
      addCustomBtn.addEventListener('click', () => {
        this.addCustomColumn();
      });
    }

    // Save changes
    const saveBtn = document.getElementById('saveTableConfig');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveConfiguration();
      });
    }
  }

  private switchTab(tabName: string): void {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    const activeTabContent = document.getElementById(`${tabName}Tab`);

    if (activeTabBtn) activeTabBtn.classList.add('active');
    if (activeTabContent) activeTabContent.classList.add('active');
  }

  private populateModalData(): void {
    if (!this.mergedConfig) return;

    this.populateDbColumns();
    this.populateCustomColumns();
  }

  private populateDbColumns(): void {
    const container = document.getElementById('dbColumnsList');
    if (!container || !this.mergedConfig) return;

    container.innerHTML = `
      <div class="drag-instructions">
        <p>💡 <strong>Arrastra las columnas</strong> para cambiar el orden en la tabla</p>
      </div>
    `;

    // Sort columns by position for display
    const sortedColumns = [...this.mergedConfig.dbColumns].sort((a, b) => a.position - b.position);

    sortedColumns.forEach((column, index) => {
      const columnDiv = document.createElement('div');
      columnDiv.className = 'column-config-item draggable';
      columnDiv.draggable = true;
      columnDiv.dataset.field = column.field;
      columnDiv.dataset.position = column.position.toString();
      
      columnDiv.innerHTML = `
        <div class="column-header">
          <div class="drag-handle">⋮⋮</div>
          <input type="checkbox" id="visible_${column.field}" ${column.visible ? 'checked' : ''}>
          <label for="visible_${column.field}">${column.label} (${column.field})</label>
          <div class="position-indicator">#${column.position + 1}</div>
        </div>
        <div class="column-details">
          <div class="form-row">
            <label>Etiqueta:</label>
            <input type="text" id="label_${column.field}" value="${column.label}">
          </div>
          <div class="form-row">
            <label>Ancho:</label>
            <input type="text" id="width_${column.field}" value="${column.width}">
          </div>
          <div class="form-row">
            <label>Filtrable:</label>
            <input type="checkbox" id="filterable_${column.field}" ${column.filterable ? 'checked' : ''}>
          </div>
        </div>
      `;
      container.appendChild(columnDiv);

      // Add drag & drop event listeners
      this.addDragDropListeners(columnDiv);
    });
  }

  private populateCustomColumns(): void {
    const container = document.getElementById('customColumnsList');
    if (!container || !this.mergedConfig) return;

    container.innerHTML = '';

    this.mergedConfig.customColumns.forEach((column, index) => {
      const columnDiv = document.createElement('div');
      columnDiv.className = 'custom-column-item';
      columnDiv.innerHTML = `
        <div class="column-header">
          <span>${column.label}</span>
          <button class="delete-btn" data-column-id="${column.id}">Eliminar</button>
        </div>
        <div class="column-details">
          <div class="form-row">
            <label>Etiqueta:</label>
            <input type="text" value="${column.label}" data-field="label" data-column-id="${column.id}">
          </div>
          <div class="form-row">
            <label>Tipo:</label>
            <select data-field="type" data-column-id="${column.id}">
              <option value="text" ${column.type === 'text' ? 'selected' : ''}>Texto</option>
              <option value="select" ${column.type === 'select' ? 'selected' : ''}>Lista</option>
              <option value="date" ${column.type === 'date' ? 'selected' : ''}>Fecha</option>
              <option value="number" ${column.type === 'number' ? 'selected' : ''}>Número</option>
            </select>
          </div>
        </div>
      `;
      container.appendChild(columnDiv);

      // Add delete functionality
      const deleteBtn = columnDiv.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.deleteCustomColumn(column.id);
        });
      }
    });
  }


  private addCustomColumn(): void {
    const labelInput = document.getElementById('newColumnLabel') as HTMLInputElement;
    const typeSelect = document.getElementById('newColumnType') as HTMLSelectElement;

    if (!labelInput || !typeSelect) return;

    const label = labelInput.value.trim();
    const type = typeSelect.value;

    if (!label) {
      alert('Por favor ingrese un nombre para la columna');
      return;
    }

    // Generate unique ID
    const id = 'custom_' + Date.now();
    
    // Get next position
    const nextPosition = Math.max(
      ...this.mergedConfig!.dbColumns.map(col => col.position),
      ...this.mergedConfig!.customColumns.map(col => col.position)
    ) + 1;

    const newColumn: CustomColumn = {
      id,
      label,
      type,
      width: '120px',
      visible: true,
      position: nextPosition,
      filterable: true,
      filterType: type === 'select' ? 'select' : 'text',
      options: type === 'select' ? ['Opción 1', 'Opción 2'] : undefined,
      defaultValue: ''
    };

    // Add to merged config
    this.mergedConfig!.customColumns.push(newColumn);

    // Clear inputs
    labelInput.value = '';
    typeSelect.value = 'text';

    // Refresh display
    this.populateCustomColumns();
  }

  private deleteCustomColumn(columnId: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar esta columna?')) {
      const index = this.mergedConfig!.customColumns.findIndex(col => col.id === columnId);
      if (index > -1) {
        this.mergedConfig!.customColumns.splice(index, 1);
        this.populateCustomColumns();
      }
    }
  }

  private addDragDropListeners(element: HTMLElement): void {
    element.addEventListener('dragstart', (e) => {
      this.draggedElement = element; // Use class property
      element.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', element.dataset.field || '');
      console.log('🟢 Drag started:', element.dataset.field);
    });

    element.addEventListener('dragend', (e) => {
      element.classList.remove('dragging');
      // Remove all drag-over indicators
      document.querySelectorAll('.column-config-item').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over');
      });
      console.log('🔴 Drag ended:', element.dataset.field);
      this.draggedElement = null; // Clear global state
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      
      if (this.draggedElement && this.draggedElement !== element) {
        const rect = element.getBoundingClientRect();
        const midPoint = rect.top + (rect.height / 2);
        
        // Clear previous classes
        element.classList.remove('drag-over-top', 'drag-over-bottom');
        
        if (e.clientY < midPoint) {
          element.classList.add('drag-over-top');
        } else {
          element.classList.add('drag-over-bottom');
        }
      }
    });

    element.addEventListener('dragleave', (e) => {
      // Only remove if leaving the element completely
      const rect = element.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        element.classList.remove('drag-over-top', 'drag-over-bottom');
      }
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over-top', 'drag-over-bottom');
      
      console.log('🎯 Drop event triggered');
      console.log('   Dragged element:', this.draggedElement?.dataset.field);
      console.log('   Target element:', element.dataset.field);
      
      if (this.draggedElement && this.draggedElement !== element) {
        const rect = element.getBoundingClientRect();
        const midPoint = rect.top + (rect.height / 2);
        const dropPosition = e.clientY < midPoint ? 'before' : 'after';
        
        console.log(`   Drop position: ${dropPosition} (clientY: ${e.clientY}, midPoint: ${midPoint})`);
        
        this.reorderColumns(this.draggedElement, element, dropPosition);
      } else {
        console.log('❌ Drop ignored: no dragged element or same element');
      }
    });
  }

  private reorderColumns(draggedElement: HTMLElement, targetElement: HTMLElement, dropPosition: 'before' | 'after'): void {
    const draggedField = draggedElement.dataset.field!;
    const targetField = targetElement.dataset.field!;
    
    if (!this.mergedConfig || draggedField === targetField) {
      console.log('❌ No reorder: same element or no config');
      return;
    }

    console.log(`🔄 Attempting reorder: ${draggedField} → ${dropPosition} ${targetField}`);

    // Create a simple array with field names in current order
    const currentOrder = this.mergedConfig.dbColumns
      .sort((a, b) => a.position - b.position)
      .map(col => col.field);
    
    console.log('📋 Current order:', currentOrder);

    // Find indices
    const draggedIndex = currentOrder.indexOf(draggedField);
    const targetIndex = currentOrder.indexOf(targetField);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      console.log('❌ Field not found in order');
      return;
    }

    // Remove dragged item from array
    const [draggedItem] = currentOrder.splice(draggedIndex, 1);
    
    // Calculate new insertion index
    let insertIndex = targetIndex;
    if (draggedIndex < targetIndex) {
      insertIndex--; // Adjust because we removed an item before target
    }
    if (dropPosition === 'after') {
      insertIndex++;
    }
    
    // Insert at new position
    currentOrder.splice(insertIndex, 0, draggedItem);
    
    console.log('📋 New order:', currentOrder);

    // Update positions in the actual columns
    currentOrder.forEach((field, index) => {
      const column = this.mergedConfig!.dbColumns.find(col => col.field === field);
      if (column) {
        column.position = index;
      }
    });

    // Re-populate to show changes
    this.populateDbColumns();
    
    console.log(`✅ Successfully reordered: ${draggedField} moved ${dropPosition} ${targetField}`);
  }

  private async saveConfiguration(): Promise<void> {
    try {
      // Collect all changes from UI
      this.collectUIChanges();

      // Save specific configuration
      const response = await fetch('/api/config/table-customizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.specificConfig)
      });

      if (!response.ok) {
        throw new Error('Error al guardar la configuración');
      }

      // Close modal
      const modal = document.getElementById('tableConfigModal');
      if (modal) {
        modal.classList.remove('active');
      }

      // Refresh table with new configuration
      await this.refreshTable();

      alert('Configuración guardada exitosamente');

    } catch (error) {
      console.error('Error al guardar la configuración:', error);
      alert('Error al guardar la configuración');
    }
  }

  private collectUIChanges(): void {
    if (!this.specificConfig || !this.mergedConfig) return;

    // Collect DB column overrides
    this.mergedConfig.dbColumns.forEach(column => {
      const visibleCheckbox = document.getElementById(`visible_${column.field}`) as HTMLInputElement;
      const labelInput = document.getElementById(`label_${column.field}`) as HTMLInputElement;
      const widthInput = document.getElementById(`width_${column.field}`) as HTMLInputElement;
      const filterableCheckbox = document.getElementById(`filterable_${column.field}`) as HTMLInputElement;

      // Always save overrides for all fields (to capture position changes from drag & drop)
      const overrides: Partial<DbColumn> = {};

      if (visibleCheckbox) {
        overrides.visible = visibleCheckbox.checked;
      }
      if (labelInput) {
        overrides.label = labelInput.value;
      }
      if (widthInput) {
        overrides.width = widthInput.value;
      }
      if (filterableCheckbox) {
        overrides.filterable = filterableCheckbox.checked;
      }
      
      // Always save position (important for drag & drop reordering)
      overrides.position = column.position;

      if (this.specificConfig) {
        this.specificConfig.table.columnOverrides[column.field] = overrides;
      }
    });

    // Update custom columns
    if (this.specificConfig && this.mergedConfig) {
      this.specificConfig.table.customColumns = [...this.mergedConfig.customColumns];
    }


    // Update timestamp
    if (this.specificConfig) {
      this.specificConfig.lastModified = new Date().toISOString();
    }
  }

  private async refreshTable(): Promise<void> {
    // Trigger table refresh with new configuration
    if ((window as any).tableHandler) {
      // Use the new dynamic refresh method instead of reloading the page
      await (window as any).tableHandler.refreshTableConfig();
    }
  }

  // Public method to get merged configuration
  public getMergedConfig(): MergedConfig | null {
    return this.mergedConfig;
  }

  // Public method to get all visible columns (DB + Custom)
  public getAllVisibleColumns(): (DbColumn | CustomColumn)[] {
    if (!this.mergedConfig) return [];

    const allColumns = [
      ...this.mergedConfig.dbColumns.filter(col => col.visible),
      ...this.mergedConfig.customColumns.filter(col => col.visible)
    ];

    return allColumns.sort((a, b) => a.position - b.position);
  }

  // Public method to get visible columns filtered by SQL columns
  public getVisibleColumnsFilteredBySql(sqlColumns: string[]): (DbColumn | CustomColumn)[] {
    if (!this.mergedConfig) return [];

    // Filter DB columns to only include those that exist in SQL
    const filteredDbColumns = this.mergedConfig.dbColumns.filter(col => 
      col.visible && sqlColumns.includes(col.field)
    );

    // Custom columns are not SQL-based, so include all visible ones
    const visibleCustomColumns = this.mergedConfig.customColumns.filter(col => col.visible);

    const allColumns = [...filteredDbColumns, ...visibleCustomColumns];
    return allColumns.sort((a, b) => a.position - b.position);
  }

  // Update configuration with SQL columns
  public updateConfigWithSqlColumns(sqlColumns: string[]): void {
    if (!this.standardConfig) return;

    // Create/update DB columns based on SQL columns (no automatic ordering)
    this.standardConfig.table.dbColumns = sqlColumns.map((field, index) => ({
      field,
      label: this.getDefaultLabelForField(field),
      type: 'text',
      width: '120px',
      visible: this.getDefaultVisibilityForField(field), // CPY_0 and STOFCY_0 hidden by default
      position: index,
      filterable: true,
      filterType: field === 'XX6FLSIGN_0' ? 'select' : 'text',
      ...(field === 'XX6FLSIGN_0' ? {
        filterOptions: [
          { value: 'no-firmados', label: 'No' },
          { value: 'si-firmados', label: 'Sí' },
          { value: '', label: 'Todos' }
        ]
      } : {}),
      sortable: true
    }));

    // Re-merge configurations
    this.mergeConfigurations();
  }

  private getDefaultLabelForField(field: string): string {
    const labelMappings: { [key: string]: string } = {
      'SDHNUM_0': 'Remito',
      'DLVDAT_0': 'Fecha', 
      'BPCORD_0': 'Código',
      'BPDNAM_0': 'Razón',
      'CPY_0': 'CPY_0',
      'STOFCY_0': 'STOFCY_0',
      'XX6FLSIGN_0': 'Firmado'
    };
    return labelMappings[field] || field;
  }

  private getDefaultVisibilityForField(field: string): boolean {
    // Hide CPY_0 and STOFCY_0 by default, but show them in config for optional activation
    const hiddenByDefault = ['CPY_0', 'STOFCY_0'];
    return !hiddenByDefault.includes(field);
  }

  private addDragDropStyles(): void {
    // Only add styles once
    if (document.getElementById('drag-drop-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'drag-drop-styles';
    styles.textContent = `
      .drag-instructions {
        background: #e8f4fd;
        border: 1px solid #b8daff;
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 16px;
        font-size: 14px;
        color: #0c5460;
      }

      .column-config-item.draggable {
        transition: all 0.2s ease;
        border: 2px solid transparent;
        border-radius: 4px;
        margin-bottom: 8px;
      }

      .column-config-item.dragging {
        opacity: 0.5;
        transform: scale(0.95);
        border-color: #007bff;
        background-color: #f8f9fa;
      }

      .column-config-item.drag-over {
        border-color: #28a745;
        background-color: #d4edda;
        transform: scale(1.02);
      }

      .column-config-item.drag-over-top {
        border-top: 4px solid #007bff;
        background-color: #e3f2fd;
        position: relative;
      }

      .column-config-item.drag-over-top::before {
        content: "⬆ Soltar ANTES de esta columna";
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: #007bff;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
      }

      .column-config-item.drag-over-bottom {
        border-bottom: 4px solid #28a745;
        background-color: #e8f5e8;
        position: relative;
      }

      .column-config-item.drag-over-bottom::after {
        content: "⬇ Soltar DESPUÉS de esta columna";
        position: absolute;
        bottom: -25px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
      }

      .column-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 4px;
      }

      .drag-handle {
        cursor: grab;
        font-size: 16px;
        color: #6c757d;
        user-select: none;
        padding: 4px;
        border-radius: 2px;
      }

      .drag-handle:hover {
        background-color: #dee2e6;
        color: #495057;
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .position-indicator {
        background: #007bff;
        color: white;
        font-size: 11px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 12px;
        margin-left: auto;
      }

      .column-config-item label {
        flex: 1;
        font-weight: 500;
      }
    `;
    document.head.appendChild(styles);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  (window as any).clientTableConfigManager = new ClientTableConfigManager();
});

export { ClientTableConfigManager };