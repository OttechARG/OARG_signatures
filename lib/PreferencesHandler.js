// User Preferences Management System - TypeScript Version
class UserPreferences {
    constructor() {
        this.hasAutoReloaded = false; // Prevent multiple auto-reloads
        this.defaultPreferences = {
            theme: 'default',
            background: 'white',
            backgroundImage: null,
            customLogo: null,
            pageSize: 50
        };
        this.defaultWorkSession = {
            puestoSeleccionado: null,
            selectedCompany: null,
            selectedCompanyName: null,
            selectedFacility: null,
            selectedFacilityName: null,
            showCompanyField: false
        };
        this.themes = {
            default: {
                primary: '#003e7e',
                primaryLight: '#1c5fbf',
                primaryHover: '#002d5e'
            },
            emerald: {
                primary: '#065f46',
                primaryLight: '#10b981',
                primaryHover: '#047857'
            },
            purple: {
                primary: '#581c87',
                primaryLight: '#8b5cf6',
                primaryHover: '#6d28d9'
            },
            orange: {
                primary: '#c2410c',
                primaryLight: '#f97316',
                primaryHover: '#ea580c'
            },
            rose: {
                primary: '#be185d',
                primaryLight: '#f43f5e',
                primaryHover: '#e11d48'
            },
            slate: {
                primary: '#374151',
                primaryLight: '#6b7280',
                primaryHover: '#4b5563'
            }
        };
        this.backgrounds = {
            white: '#ffffff',
            'light-gray': '#f8fafc',
            'blue-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            sunset: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
            forest: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
            ocean: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)'
        };
        this.preferences = { ...this.defaultPreferences };
        this.workSession = { ...this.defaultWorkSession };
        this.init();
    }
    async init() {
        await this.loadPreferences();
        this.loadWorkSession();
        this.attachEventListeners();
        this.applyTheme();
        this.restoreWorkSessionUI();
    }
    async loadPreferences() {
        try {
            const response = await fetch('/api/visual-preferences');
            if (response.ok) {
                const saved = await response.json();
                // Merge with defaults to handle missing properties
                this.preferences = { ...this.defaultPreferences, ...saved };
            }
            else {
                this.preferences = { ...this.defaultPreferences };
            }
        }
        catch (error) {
            console.error('Error loading preferences:', error);
            this.preferences = { ...this.defaultPreferences };
        }
    }
    async savePreferences() {
        try {
            const response = await fetch('/api/visual-preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.preferences)
            });
            if (!response.ok) {
                throw new Error('Failed to save preferences');
            }
        }
        catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    loadWorkSession() {
        try {
            const saved = sessionStorage.getItem('workSession');
            this.workSession = saved ? JSON.parse(saved) : { ...this.defaultWorkSession };
        }
        catch (error) {
            console.error('Error loading work session:', error);
            this.workSession = { ...this.defaultWorkSession };
        }
    }
    saveWorkSession() {
        try {
            sessionStorage.setItem('workSession', JSON.stringify(this.workSession));
        }
        catch (error) {
            console.error('Error saving work session:', error);
        }
    }
    applyTheme() {
        const root = document.documentElement;
        const theme = this.themes[this.preferences.theme];
        if (theme) {
            root.style.setProperty('--theme-primary', theme.primary);
            root.style.setProperty('--theme-primary-light', theme.primaryLight);
            root.style.setProperty('--theme-primary-hover', theme.primaryHover);
        }
        this.applyBackground();
        this.applyLogo();
        this.updateUISelections();
    }
    applyBackground() {
        const root = document.documentElement;
        if (this.preferences.backgroundImage) {
            root.style.setProperty('--background-image', `url(${this.preferences.backgroundImage})`);
            root.style.setProperty('--background-color', 'transparent');
        }
        else {
            root.style.setProperty('--background-image', 'none');
            const bgValue = this.backgrounds[this.preferences.background] || this.backgrounds.white;
            // Handle gradients vs solid colors
            if (bgValue.includes('gradient')) {
                root.style.setProperty('--background-color', 'transparent');
                root.style.setProperty('--background-image', bgValue);
            }
            else {
                root.style.setProperty('--background-color', bgValue);
                root.style.setProperty('--background-image', 'none');
            }
        }
    }
    applyLogo() {
        const logoElement = document.querySelector('.logo');
        if (logoElement && this.preferences.customLogo) {
            logoElement.src = this.preferences.customLogo;
        }
        else if (logoElement) {
            logoElement.src = 'assets/logo-fondo-blanco.jpg';
        }
        const previewLogo = document.getElementById('currentLogo');
        if (previewLogo) {
            previewLogo.src = this.preferences.customLogo || 'assets/logo-fondo-blanco.jpg';
        }
    }
    updateUISelections() {
        // Update theme selection
        document.querySelectorAll('#colorThemes .color-option').forEach((option) => {
            const element = option;
            element.classList.remove('selected');
            if (element.dataset.theme === this.preferences.theme) {
                element.classList.add('selected');
            }
        });
        // Update background selection
        document.querySelectorAll('#backgroundOptions .color-option').forEach((option) => {
            const element = option;
            element.classList.remove('selected');
            if (element.dataset.bg === this.preferences.background && !this.preferences.backgroundImage) {
                element.classList.add('selected');
            }
        });
        // Clear background selection if custom image is set
        if (this.preferences.backgroundImage) {
            document.querySelectorAll('#backgroundOptions .color-option').forEach((option) => {
                const element = option;
                element.classList.remove('selected');
            });
        }
    }
    restoreWorkSessionUI() {
        // Restore puesto selection using new button system
        if (this.workSession.puestoSeleccionado) {
            console.log("Restoring puesto from session:", this.workSession.puestoSeleccionado);
            window.puestoSeleccionado = this.workSession.puestoSeleccionado;
            // Trigger puesto-related UI logic after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.triggerPuestoLogic(this.workSession.puestoSeleccionado);
            }, 200);
        }
    }
    triggerPuestoLogic(puesto) {
        console.log("Triggering puesto logic for:", puesto);
        // Update puesto button selection visually
        if (window.updatePuestoButtonSelection) {
            window.updatePuestoButtonSelection(puesto);
        }
        // Import Puestos dynamically or check if it exists
        if (window.Puestos && window.showFieldsAssociatedWithPuesto1) {
            const Puestos = window.Puestos;
            if (puesto === Puestos.lista[0]) {
                console.log("Showing fields for Punto de Venta Entregas");
                // Trigger the same logic as in signMain.ts
                window.showFieldsAssociatedWithPuesto1();
                this.setCompanyFieldVisibility(true);
                // After UI is created, restore company/facility data
                setTimeout(() => {
                    this.restoreCompanyFacilityData();
                }, 300);
            }
            else {
                console.log("Handling other puesto:", puesto);
                this.setCompanyFieldVisibility(false);
                // Create save button for non-punto de venta puestos
                if (window.createSaveButton) {
                    window.createSaveButton();
                }
            }
        }
    }
    restoreCompanyFacilityData() {
        // Restore company selection
        if (this.workSession.selectedCompany && this.workSession.selectedCompanyName) {
            const companyInput = document.getElementById("buscarCompania");
            if (companyInput) {
                companyInput.value = this.workSession.selectedCompanyName;
                companyInput.dataset.selectedCpy = this.workSession.selectedCompany;
            }
        }
        // Restore facility selection
        if (this.workSession.selectedFacility && this.workSession.selectedFacilityName) {
            const facilityInput = document.getElementById("facility");
            if (facilityInput) {
                facilityInput.value = this.workSession.selectedFacilityName;
                facilityInput.dataset.facilityCode = this.workSession.selectedFacility;
            }
        }
        // Auto-reload table if all data is available, but only once per page load
        if (this.workSession.puestoSeleccionado &&
            this.workSession.selectedCompany &&
            this.workSession.selectedFacility &&
            !this.hasAutoReloaded) {
            // Use a longer delay and ensure we only do this once per page load
            setTimeout(() => {
                if (!this.hasAutoReloaded) { // Double-check to prevent race conditions
                    this.hasAutoReloaded = true;
                    this.autoReloadTable();
                }
            }, 1000); // 1 second delay to ensure everything is initialized
        }
    }
    async autoReloadTable() {
        try {
            // Wait a bit more to ensure all DOM elements are ready
            setTimeout(async () => {
                if (window.remitosHandler && window.tableHandler) {
                    const fechaDesdeInput = document.getElementById("fechaDesde");
                    const fechaDesde = fechaDesdeInput?.value || undefined;
                    console.log('Auto-reloading table with session data:', {
                        company: this.workSession.selectedCompany,
                        facility: this.workSession.selectedFacility,
                        fechaDesde
                    });
                    const pageSize = this.getPageSize();
                    const result = await window.remitosHandler.fetchRemitos(this.workSession.selectedCompany, this.workSession.selectedFacility, fechaDesde, 1, pageSize, 'no-firmados');
                    window.tableHandler.currentParams = {
                        company: this.workSession.selectedCompany,
                        facility: this.workSession.selectedFacility,
                        fechaDesde
                    };
                    window.tableHandler.renderTable(result.remitos, result.pagination);
                    // Ensure "No" filter is selected after auto-reload
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
                    console.log('Table auto-reloaded successfully');
                }
            }, 500);
        }
        catch (error) {
            console.error('Error auto-reloading table:', error);
        }
    }
    // Work Session Management Methods
    setPuesto(puesto) {
        this.workSession.puestoSeleccionado = puesto;
        this.saveWorkSession();
        window.puestoSeleccionado = puesto;
    }
    setCompany(company, companyName = null) {
        this.workSession.selectedCompany = company;
        this.workSession.selectedCompanyName = companyName;
        this.saveWorkSession();
    }
    setFacility(facility, facilityName = null) {
        this.workSession.selectedFacility = facility;
        this.workSession.selectedFacilityName = facilityName;
        this.saveWorkSession();
    }
    setCompanyFieldVisibility(show) {
        this.workSession.showCompanyField = show;
        this.saveWorkSession();
        const companyContainer = document.getElementById("buscarCompaniaContainer");
        if (companyContainer) {
            companyContainer.style.display = show ? "block" : "none";
        }
    }
    getWorkSession() {
        return { ...this.workSession };
    }
    clearWorkSession() {
        this.workSession = { ...this.defaultWorkSession };
        this.saveWorkSession();
        window.puestoSeleccionado = null;
        // Clear UI elements
        const searchInput = document.getElementById("searchInput");
        if (searchInput)
            searchInput.value = "";
        const companyInput = document.getElementById("buscarCompania");
        if (companyInput) {
            companyInput.value = "";
            delete companyInput.dataset.selectedCpy;
        }
        const facilityInput = document.getElementById("facility");
        if (facilityInput) {
            facilityInput.value = "";
            delete facilityInput.dataset.facilityCode;
        }
    }
    selectTheme(theme) {
        if (this.themes[theme]) {
            this.preferences.theme = theme;
            this.applyTheme();
        }
    }
    selectBackground(background) {
        if (this.backgrounds[background]) {
            this.preferences.background = background;
            this.preferences.backgroundImage = null;
            this.applyTheme();
        }
    }
    setBackgroundImage(imageDataUrl) {
        this.preferences.backgroundImage = imageDataUrl;
        this.preferences.background = 'custom';
        this.applyTheme();
    }
    setCustomLogo(imageDataUrl) {
        this.preferences.customLogo = imageDataUrl;
        this.applyTheme();
    }
    resetLogo() {
        this.preferences.customLogo = null;
        this.applyTheme();
    }
    async resetToDefaults() {
        this.preferences = { ...this.defaultPreferences };
        this.applyTheme();
        await this.savePreferences();
    }
    async setPageSize(pageSize) {
        this.preferences.pageSize = pageSize;
        await this.savePreferences();
    }
    getPageSize() {
        return this.preferences.pageSize || 50;
    }
    attachEventListeners() {
        // Settings dropdown toggle
        const settingsToggle = document.getElementById('settingsToggle');
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsToggle && settingsMenu) {
            settingsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsMenu.classList.toggle('active');
            });
            document.addEventListener('click', () => {
                settingsMenu.classList.remove('active');
            });
            settingsMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        // Open preferences modal
        const openPreferences = document.getElementById('openPreferences');
        const preferencesModal = document.getElementById('preferencesModal');
        if (openPreferences && preferencesModal) {
            openPreferences.addEventListener('click', () => {
                preferencesModal.classList.add('active');
                if (settingsMenu)
                    settingsMenu.classList.remove('active');
            });
        }
        // Close preferences modal
        const closePreferences = document.getElementById('closePreferences');
        if (closePreferences && preferencesModal) {
            closePreferences.addEventListener('click', () => {
                preferencesModal.classList.remove('active');
            });
        }
        // Close modal when clicking backdrop
        if (preferencesModal) {
            preferencesModal.addEventListener('click', (e) => {
                if (e.target === preferencesModal) {
                    preferencesModal.classList.remove('active');
                }
            });
        }
        // Theme selection
        document.querySelectorAll('#colorThemes .color-option').forEach((option) => {
            const element = option;
            element.addEventListener('click', () => {
                const theme = element.dataset.theme;
                if (theme)
                    this.selectTheme(theme);
            });
        });
        // Background selection
        document.querySelectorAll('#backgroundOptions .color-option').forEach((option) => {
            const element = option;
            element.addEventListener('click', () => {
                const background = element.dataset.bg;
                if (background)
                    this.selectBackground(background);
            });
        });
        // Background image upload
        const backgroundUpload = document.getElementById('backgroundUpload');
        if (backgroundUpload) {
            backgroundUpload.addEventListener('change', (e) => {
                const target = e.target;
                const file = target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result;
                        if (result)
                            this.setBackgroundImage(result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        // Logo upload
        const logoUpload = document.getElementById('logoUpload');
        if (logoUpload) {
            logoUpload.addEventListener('change', (e) => {
                const target = e.target;
                const file = target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result;
                        if (result)
                            this.setCustomLogo(result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        // Reset logo
        const resetLogo = document.getElementById('resetLogo');
        if (resetLogo) {
            resetLogo.addEventListener('click', () => {
                this.resetLogo();
            });
        }
        // Reset settings
        const resetSettings = document.getElementById('resetSettings');
        if (resetSettings) {
            resetSettings.addEventListener('click', async () => {
                if (confirm('¿Estás seguro de que quieres restablecer todas las preferencias?')) {
                    await this.resetToDefaults();
                }
            });
        }
        // Page size selection (now in hamburger menu)
        const pageSizeMenuSelect = document.getElementById('pageSizeMenuSelect');
        if (pageSizeMenuSelect) {
            // Set current value with fallback for undefined pageSize
            const currentPageSize = this.preferences.pageSize || 50;
            pageSizeMenuSelect.value = currentPageSize.toString();
            pageSizeMenuSelect.addEventListener('change', async () => {
                const pageSize = parseInt(pageSizeMenuSelect.value);
                await this.setPageSize(pageSize);
                // Only refresh table if we have complete session data AND table has been rendered at least once
                if (window.refreshCurrentTable &&
                    this.workSession.selectedCompany &&
                    this.workSession.selectedFacility &&
                    window.tableHandler?.currentParams) {
                    window.refreshCurrentTable(1, pageSize); // Reset to page 1 with new size
                }
            });
        }
        // Save preferences
        const savePreferences = document.getElementById('savePreferences');
        if (savePreferences && preferencesModal) {
            savePreferences.addEventListener('click', async () => {
                await this.savePreferences();
                preferencesModal.classList.remove('active');
                // Show success message
                const originalText = savePreferences.textContent;
                savePreferences.textContent = '✅ Guardado!';
                savePreferences.style.background = '#28a745';
                setTimeout(() => {
                    if (originalText)
                        savePreferences.textContent = originalText;
                    savePreferences.style.background = 'var(--theme-primary)';
                }, 2000);
            });
        }
    }
    // Public getters for accessing current preferences
    getCurrentTheme() {
        return this.preferences.theme;
    }
    getCurrentBackground() {
        return this.preferences.background;
    }
    getPreferences() {
        return { ...this.preferences };
    }
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.userPreferences = new UserPreferences();
});
// Export for module system
export { UserPreferences };
