class ClientTableConfigManager {
    constructor() {
        this.standardConfig = null;
        this.specificConfig = null;
        this.mergedConfig = null;
        this.draggedElement = null; // Global drag state
        this.isConfigReady = false; // Flag to track if config is fully loaded
        this.showLoadingOverlay();
        this.init();
    }
    async init() {
        await this.loadConfigurations();
        this.attachEventListeners();
    }
    async loadConfigurations() {
        try {
            // Load both configurations in parallel to avoid flash
            const [standardResponse, specificResponse] = await Promise.all([
                fetch('/api/config/table-defaults'),
                fetch('/api/config/table-customizations')
            ]);
            // Process standard configuration
            if (standardResponse.ok) {
                this.standardConfig = await standardResponse.json();
            }
            else {
                console.error('Error al cargar la configuración estándar');
            }
            // Process specific configuration
            if (specificResponse.ok) {
                this.specificConfig = await specificResponse.json();
            }
            else {
                console.error('Error al cargar la configuración específica');
            }
            // Only merge and show after BOTH configs are loaded
            this.mergeConfigurations();
            this.isConfigReady = true; // Mark config as ready
            this.hideLoadingOverlay(); // Hide overlay and show table
            console.log("✅ Configuration loading complete - ready to display");
        }
        catch (error) {
            console.error('Error al cargar las configuraciones:', error);
            this.isConfigReady = true; // Mark as ready even on error to prevent infinite waiting
            this.hideLoadingOverlay(); // Hide overlay even on error
        }
    }
    mergeConfigurations() {
        // If we have specific configuration, prioritize it
        if (this.specificConfig) {
            console.log("🎯 Using specific configuration as primary source");
            let dbColumns = [];
            // If we also have standard config, use it as base
            if (this.standardConfig) {
                dbColumns = [...this.standardConfig.table.dbColumns];
            }
            // Apply ALL overrides from specific config (this is the saved user config)
            Object.keys(this.specificConfig.table.columnOverrides).forEach(field => {
                const override = this.specificConfig.table.columnOverrides[field];
                const existingIndex = dbColumns.findIndex(col => col.field === field);
                if (existingIndex >= 0) {
                    // Update existing column
                    dbColumns[existingIndex] = { ...dbColumns[existingIndex], ...override };
                }
                else if (override) {
                    // Create new column from override (for new fields from SQL)
                    const newColumn = {
                        field,
                        label: override.label || field,
                        type: 'text',
                        width: override.width || '120px',
                        visible: override.visible !== undefined ? override.visible : true,
                        position: override.position || 0,
                        filterable: override.filterable !== undefined ? override.filterable : true,
                        filterType: 'text',
                        sortable: true,
                        ...(field === 'XX6FLSIGN_0' ? {
                            filterType: 'select',
                            filterOptions: [
                                { value: 'no-firmados', label: 'No' },
                                { value: 'si-firmados', label: 'Sí' },
                                { value: '', label: 'Todos' }
                            ]
                        } : {})
                    };
                    dbColumns.push(newColumn);
                }
            });
            // Sort columns by position
            dbColumns.sort((a, b) => a.position - b.position);
            // Merge settings (specific overrides standard)
            const settings = {
                ...(this.standardConfig?.table.settings || {}),
                ...this.specificConfig.table.settings
            };
            this.mergedConfig = {
                dbColumns,
                settings
            };
        }
        else if (this.standardConfig) {
            // Fallback to standard only if no specific config
            console.log("⚠️ Using standard configuration as fallback");
            this.mergedConfig = {
                dbColumns: [...this.standardConfig.table.dbColumns].sort((a, b) => a.position - b.position),
                settings: this.standardConfig.table.settings
            };
        }
    }
    attachEventListeners() {
        // Open table config modal
        const openTableConfig = document.getElementById('openTableConfig');
        if (openTableConfig) {
            openTableConfig.addEventListener('click', () => {
                this.openConfigModal();
            });
        }
    }
    openConfigModal() {
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
    createConfigModal() {
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
            </div>
            
            <!-- Current Columns Tab -->
            <div id="columnsTab" class="tab-content active">
              <div class="columns-list" id="dbColumnsList">
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
    attachModalEventListeners() {
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
        // No tab switching needed - only one tab remains
        // Save changes
        const saveBtn = document.getElementById('saveTableConfig');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveConfiguration();
            });
        }
    }
    populateModalData() {
        if (!this.mergedConfig)
            return;
        this.populateDbColumns();
    }
    populateDbColumns() {
        const container = document.getElementById('dbColumnsList');
        if (!container || !this.mergedConfig)
            return;
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
            // Don't set draggable on the main div - only on drag handle
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
            // Add drag & drop event listeners only to the drag handle
            const dragHandle = columnDiv.querySelector('.drag-handle');
            if (dragHandle) {
                this.addDragDropListeners(columnDiv, dragHandle);
            }
        });
    }
    addDragDropListeners(element, dragHandle) {
        // Make the drag handle draggable
        dragHandle.draggable = true;
        dragHandle.addEventListener('dragstart', (e) => {
            this.draggedElement = element; // Use class property
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', element.dataset.field || '');
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
            e.dataTransfer.dropEffect = 'move';
            if (this.draggedElement && this.draggedElement !== element) {
                const rect = element.getBoundingClientRect();
                const midPoint = rect.top + (rect.height / 2);
                // Clear previous classes
                element.classList.remove('drag-over-top', 'drag-over-bottom');
                if (e.clientY < midPoint) {
                    element.classList.add('drag-over-top');
                }
                else {
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
            }
            else {
                console.log('❌ Drop ignored: no dragged element or same element');
            }
        });
    }
    reorderColumns(draggedElement, targetElement, dropPosition) {
        const draggedField = draggedElement.dataset.field;
        const targetField = targetElement.dataset.field;
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
            const column = this.mergedConfig.dbColumns.find(col => col.field === field);
            if (column) {
                column.position = index;
            }
        });
        // Re-populate to show changes
        this.populateDbColumns();
        console.log(`✅ Successfully reordered: ${draggedField} moved ${dropPosition} ${targetField}`);
    }
    async saveConfiguration() {
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
        }
        catch (error) {
            console.error('Error al guardar la configuración:', error);
            alert('Error al guardar la configuración');
        }
    }
    collectUIChanges() {
        if (!this.specificConfig || !this.mergedConfig)
            return;
        // Collect DB column overrides
        this.mergedConfig.dbColumns.forEach(column => {
            const visibleCheckbox = document.getElementById(`visible_${column.field}`);
            const labelInput = document.getElementById(`label_${column.field}`);
            const widthInput = document.getElementById(`width_${column.field}`);
            const filterableCheckbox = document.getElementById(`filterable_${column.field}`);
            // Always save overrides for all fields (to capture position changes from drag & drop)
            const overrides = {};
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
        // Update timestamp
        if (this.specificConfig) {
            this.specificConfig.lastModified = new Date().toISOString();
        }
    }
    async refreshTable() {
        // Trigger table refresh with new configuration
        if (window.tableHandler) {
            // Use the new dynamic refresh method instead of reloading the page
            await window.tableHandler.refreshTableConfig();
        }
    }
    // Public method to get merged configuration
    getMergedConfig() {
        return this.mergedConfig;
    }
    // Public method to check if configuration is ready
    isReady() {
        return this.isConfigReady;
    }
    showLoadingOverlay() {
        const overlay = document.getElementById('configLoadingOverlay');
        const table = document.getElementById('remitosTable');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        if (table) {
            table.style.opacity = '0';
        }
    }
    hideLoadingOverlay() {
        const overlay = document.getElementById('configLoadingOverlay');
        const table = document.getElementById('remitosTable');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        if (table) {
            table.style.opacity = '1';
        }
    }
    // Public method to get all visible columns
    getAllVisibleColumns() {
        if (!this.mergedConfig)
            return [];
        const allColumns = this.mergedConfig.dbColumns.filter(col => col.visible);
        return allColumns.sort((a, b) => a.position - b.position);
    }
    // Public method to get visible columns filtered by SQL columns
    getVisibleColumnsFilteredBySql(sqlColumns) {
        if (!this.mergedConfig)
            return [];
        // Filter DB columns to only include those that exist in SQL
        const filteredDbColumns = this.mergedConfig.dbColumns.filter(col => col.visible && sqlColumns.includes(col.field));
        return filteredDbColumns.sort((a, b) => a.position - b.position);
    }
    // Update configuration with SQL columns
    updateConfigWithSqlColumns(sqlColumns) {
        if (!this.standardConfig)
            return;
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
    getDefaultLabelForField(field) {
        const labelMappings = {
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
    getDefaultVisibilityForField(field) {
        // Hide CPY_0 and STOFCY_0 by default, but show them in config for optional activation
        const hiddenByDefault = ['CPY_0', 'STOFCY_0'];
        return !hiddenByDefault.includes(field);
    }
    addDragDropStyles() {
        // Only add styles once
        if (document.getElementById('drag-drop-styles'))
            return;
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

      /* Ensure input fields work normally */
      .column-details input,
      .column-details select {
        pointer-events: auto;
        user-select: text;
        cursor: text;
      }
      
      .column-details input:focus,
      .column-details select:focus {
        outline: 2px solid var(--theme-primary);
        outline-offset: 2px;
      }
    `;
        document.head.appendChild(styles);
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.clientTableConfigManager = new ClientTableConfigManager();
});
export { ClientTableConfigManager };
