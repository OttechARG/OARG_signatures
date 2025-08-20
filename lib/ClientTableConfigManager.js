class ClientTableConfigManager {
    constructor() {
        this.standardConfig = null;
        this.specificConfig = null;
        this.mergedConfig = null;
        this.init();
    }
    async init() {
        await this.loadConfigurations();
        this.attachEventListeners();
    }
    async loadConfigurations() {
        try {
            // Load standard configuration
            const standardResponse = await fetch('/api/config/client-standard');
            if (standardResponse.ok) {
                this.standardConfig = await standardResponse.json();
            }
            else {
                console.error('Failed to load standard config');
            }
            // Load specific configuration  
            const specificResponse = await fetch('/api/config/client-specific');
            if (specificResponse.ok) {
                this.specificConfig = await specificResponse.json();
            }
            else {
                console.error('Failed to load specific config');
            }
            // Merge configurations
            this.mergeConfigurations();
        }
        catch (error) {
            console.error('Error loading configurations:', error);
        }
    }
    mergeConfigurations() {
        if (!this.standardConfig || !this.specificConfig)
            return;
        // Start with standard DB columns
        let dbColumns = [...this.standardConfig.table.dbColumns];
        // Apply column overrides from specific config
        dbColumns = dbColumns.map(col => {
            const override = this.specificConfig.table.columnOverrides[col.field];
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
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
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
    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        // Add active class to selected tab and content
        const activeTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeTabContent = document.getElementById(`${tabName}Tab`);
        if (activeTabBtn)
            activeTabBtn.classList.add('active');
        if (activeTabContent)
            activeTabContent.classList.add('active');
    }
    populateModalData() {
        if (!this.mergedConfig)
            return;
        this.populateDbColumns();
        this.populateCustomColumns();
    }
    populateDbColumns() {
        const container = document.getElementById('dbColumnsList');
        if (!container || !this.mergedConfig)
            return;
        container.innerHTML = '';
        this.mergedConfig.dbColumns.forEach((column, index) => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'column-config-item';
            columnDiv.innerHTML = `
        <div class="column-header">
          <input type="checkbox" id="visible_${column.field}" ${column.visible ? 'checked' : ''}>
          <label for="visible_${column.field}">${column.label} (${column.field})</label>
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
        });
    }
    populateCustomColumns() {
        const container = document.getElementById('customColumnsList');
        if (!container || !this.mergedConfig)
            return;
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
    addCustomColumn() {
        const labelInput = document.getElementById('newColumnLabel');
        const typeSelect = document.getElementById('newColumnType');
        if (!labelInput || !typeSelect)
            return;
        const label = labelInput.value.trim();
        const type = typeSelect.value;
        if (!label) {
            alert('Por favor ingrese un nombre para la columna');
            return;
        }
        // Generate unique ID
        const id = 'custom_' + Date.now();
        // Get next position
        const nextPosition = Math.max(...this.mergedConfig.dbColumns.map(col => col.position), ...this.mergedConfig.customColumns.map(col => col.position)) + 1;
        const newColumn = {
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
        this.mergedConfig.customColumns.push(newColumn);
        // Clear inputs
        labelInput.value = '';
        typeSelect.value = 'text';
        // Refresh display
        this.populateCustomColumns();
    }
    deleteCustomColumn(columnId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta columna?')) {
            const index = this.mergedConfig.customColumns.findIndex(col => col.id === columnId);
            if (index > -1) {
                this.mergedConfig.customColumns.splice(index, 1);
                this.populateCustomColumns();
            }
        }
    }
    async saveConfiguration() {
        try {
            // Collect all changes from UI
            this.collectUIChanges();
            // Save specific configuration
            const response = await fetch('/api/config/client-specific', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.specificConfig)
            });
            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }
            // Close modal
            const modal = document.getElementById('tableConfigModal');
            if (modal) {
                modal.classList.remove('active');
            }
            // Refresh table with new configuration
            await this.refreshTable();
            alert('Configuración guardada exitosamente');
        }
        catch (error) {
            console.error('Error saving configuration:', error);
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
            if (visibleCheckbox || labelInput || widthInput || filterableCheckbox) {
                const overrides = {};
                if (visibleCheckbox && visibleCheckbox.checked !== column.visible) {
                    overrides.visible = visibleCheckbox.checked;
                }
                if (labelInput && labelInput.value !== column.label) {
                    overrides.label = labelInput.value;
                }
                if (widthInput && widthInput.value !== column.width) {
                    overrides.width = widthInput.value;
                }
                if (filterableCheckbox && filterableCheckbox.checked !== column.filterable) {
                    overrides.filterable = filterableCheckbox.checked;
                }
                if (Object.keys(overrides).length > 0 && this.specificConfig) {
                    this.specificConfig.table.columnOverrides[column.field] = overrides;
                }
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
    async refreshTable() {
        // Trigger table refresh with new configuration
        if (window.tableHandler) {
            // Force reload of table with new configuration
            location.reload();
        }
    }
    // Public method to get merged configuration
    getMergedConfig() {
        return this.mergedConfig;
    }
    // Public method to get all visible columns (DB + Custom)
    getAllVisibleColumns() {
        if (!this.mergedConfig)
            return [];
        const allColumns = [
            ...this.mergedConfig.dbColumns.filter(col => col.visible),
            ...this.mergedConfig.customColumns.filter(col => col.visible)
        ];
        return allColumns.sort((a, b) => a.position - b.position);
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.clientTableConfigManager = new ClientTableConfigManager();
});
export { ClientTableConfigManager };
