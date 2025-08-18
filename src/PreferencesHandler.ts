// User Preferences Management System - TypeScript Version

interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryHover: string;
}

interface UserPreferencesData {
  theme: string;
  background: string;
  backgroundImage: string | null;
  customLogo: string | null;
  pageSize: number;
}

interface WorkSessionData {
  puestoSeleccionado: string | null;
  selectedCompany: string | null;
  selectedCompanyName: string | null;
  selectedFacility: string | null;
  selectedFacilityName: string | null;
  showCompanyField: boolean;
}

interface ThemeCollection {
  [key: string]: ThemeColors;
}

interface BackgroundCollection {
  [key: string]: string;
}

class UserPreferences {
  private defaultPreferences: UserPreferencesData;
  private preferences: UserPreferencesData;
  private defaultWorkSession: WorkSessionData;
  private workSession: WorkSessionData;
  private themes: ThemeCollection;
  private backgrounds: BackgroundCollection;

  constructor() {
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

  private init(): void {
    this.loadPreferences();
    this.loadWorkSession();
    this.attachEventListeners();
    this.applyTheme();
    this.restoreWorkSessionUI();
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing properties like pageSize
        this.preferences = { ...this.defaultPreferences, ...parsed };
      } else {
        this.preferences = { ...this.defaultPreferences };
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      this.preferences = { ...this.defaultPreferences };
    }
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }

  private loadWorkSession(): void {
    try {
      const saved = sessionStorage.getItem('workSession');
      this.workSession = saved ? JSON.parse(saved) : { ...this.defaultWorkSession };
    } catch (error) {
      console.error('Error loading work session:', error);
      this.workSession = { ...this.defaultWorkSession };
    }
  }

  private saveWorkSession(): void {
    try {
      sessionStorage.setItem('workSession', JSON.stringify(this.workSession));
    } catch (error) {
      console.error('Error saving work session:', error);
    }
  }

  private applyTheme(): void {
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

  private applyBackground(): void {
    const root = document.documentElement;
    
    if (this.preferences.backgroundImage) {
      root.style.setProperty('--background-image', `url(${this.preferences.backgroundImage})`);
      root.style.setProperty('--background-color', 'transparent');
    } else {
      root.style.setProperty('--background-image', 'none');
      const bgValue = this.backgrounds[this.preferences.background] || this.backgrounds.white;
      
      // Handle gradients vs solid colors
      if (bgValue.includes('gradient')) {
        root.style.setProperty('--background-color', 'transparent');
        root.style.setProperty('--background-image', bgValue);
      } else {
        root.style.setProperty('--background-color', bgValue);
        root.style.setProperty('--background-image', 'none');
      }
    }
  }

  private applyLogo(): void {
    const logoElement = document.querySelector('.logo') as HTMLImageElement;
    if (logoElement && this.preferences.customLogo) {
      logoElement.src = this.preferences.customLogo;
    } else if (logoElement) {
      logoElement.src = 'assets/logo-fondo-blanco.jpg';
    }

    const previewLogo = document.getElementById('currentLogo') as HTMLImageElement;
    if (previewLogo) {
      previewLogo.src = this.preferences.customLogo || 'assets/logo-fondo-blanco.jpg';
    }
  }

  private updateUISelections(): void {
    // Update theme selection
    document.querySelectorAll('#colorThemes .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.classList.remove('selected');
      if (element.dataset.theme === this.preferences.theme) {
        element.classList.add('selected');
      }
    });

    // Update background selection
    document.querySelectorAll('#backgroundOptions .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.classList.remove('selected');
      if (element.dataset.bg === this.preferences.background && !this.preferences.backgroundImage) {
        element.classList.add('selected');
      }
    });

    // Clear background selection if custom image is set
    if (this.preferences.backgroundImage) {
      document.querySelectorAll('#backgroundOptions .color-option').forEach((option: Element) => {
        const element = option as HTMLElement;
        element.classList.remove('selected');
      });
    }
  }

  private restoreWorkSessionUI(): void {
    // Restore puesto selection using new button system
    if (this.workSession.puestoSeleccionado) {
      console.log("Restoring puesto from session:", this.workSession.puestoSeleccionado);
      (window as any).puestoSeleccionado = this.workSession.puestoSeleccionado;
      
      // Trigger puesto-related UI logic after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.triggerPuestoLogic(this.workSession.puestoSeleccionado!);
      }, 200);
    }
  }

  private triggerPuestoLogic(puesto: string): void {
    console.log("Triggering puesto logic for:", puesto);
    
    // Update puesto button selection visually
    if ((window as any).updatePuestoButtonSelection) {
      (window as any).updatePuestoButtonSelection(puesto);
    }
    
    // Import Puestos dynamically or check if it exists
    if ((window as any).Puestos && (window as any).showFieldsAssociatedWithPuesto1) {
      const Puestos = (window as any).Puestos;
      if (puesto === Puestos.lista[0]) {
        console.log("Showing fields for Punto de Venta Entregas");
        // Trigger the same logic as in signMain.ts
        (window as any).showFieldsAssociatedWithPuesto1();
        this.setCompanyFieldVisibility(true);
        
        // After UI is created, restore company/facility data
        setTimeout(() => {
          this.restoreCompanyFacilityData();
        }, 300);
      } else {
        console.log("Handling other puesto:", puesto);
        this.setCompanyFieldVisibility(false);
        // Create save button for non-punto de venta puestos
        if ((window as any).createSaveButton) {
          (window as any).createSaveButton();
        }
      }
    }
  }

  private restoreCompanyFacilityData(): void {
    // Restore company selection
    if (this.workSession.selectedCompany && this.workSession.selectedCompanyName) {
      const companyInput = document.getElementById("buscarCompania") as HTMLInputElement;
      if (companyInput) {
        companyInput.value = this.workSession.selectedCompanyName;
        companyInput.dataset.selectedCpy = this.workSession.selectedCompany;
      }
    }

    // Restore facility selection
    if (this.workSession.selectedFacility && this.workSession.selectedFacilityName) {
      const facilityInput = document.getElementById("facility") as HTMLInputElement;
      if (facilityInput) {
        facilityInput.value = this.workSession.selectedFacilityName;
        facilityInput.dataset.facilityCode = this.workSession.selectedFacility;
      }
    }

    // Auto-reload table if all data is available
    if (this.workSession.puestoSeleccionado && 
        this.workSession.selectedCompany && 
        this.workSession.selectedFacility) {
      this.autoReloadTable();
    }
  }

  private async autoReloadTable(): Promise<void> {
    try {
      // Wait a bit more to ensure all DOM elements are ready
      setTimeout(async () => {
        if ((window as any).remitosHandler && (window as any).tableHandler) {
          const fechaDesdeInput = document.getElementById("fechaDesde") as HTMLInputElement;
          const fechaDesde = fechaDesdeInput?.value || undefined;
          
          console.log('Auto-reloading table with session data:', {
            company: this.workSession.selectedCompany,
            facility: this.workSession.selectedFacility,
            fechaDesde
          });
          
          const pageSize = this.getPageSize();
          const result = await (window as any).remitosHandler.fetchRemitos(
            this.workSession.selectedCompany,
            this.workSession.selectedFacility,
            fechaDesde,
            1,
            pageSize
          );
          (window as any).tableHandler.currentParams = { 
            company: this.workSession.selectedCompany, 
            facility: this.workSession.selectedFacility, 
            fechaDesde 
          };
          (window as any).tableHandler.renderTable(result.remitos, result.pagination);
          console.log('Table auto-reloaded successfully');
        }
      }, 500);
    } catch (error) {
      console.error('Error auto-reloading table:', error);
    }
  }

  // Work Session Management Methods
  public setPuesto(puesto: string | null): void {
    this.workSession.puestoSeleccionado = puesto;
    this.saveWorkSession();
    (window as any).puestoSeleccionado = puesto;
  }

  public setCompany(company: string | null, companyName: string | null = null): void {
    this.workSession.selectedCompany = company;
    this.workSession.selectedCompanyName = companyName;
    this.saveWorkSession();
  }

  public setFacility(facility: string | null, facilityName: string | null = null): void {
    this.workSession.selectedFacility = facility;
    this.workSession.selectedFacilityName = facilityName;
    this.saveWorkSession();
  }

  public setCompanyFieldVisibility(show: boolean): void {
    this.workSession.showCompanyField = show;
    this.saveWorkSession();
    
    const companyContainer = document.getElementById("buscarCompaniaContainer");
    if (companyContainer) {
      companyContainer.style.display = show ? "block" : "none";
    }
  }

  public getWorkSession(): WorkSessionData {
    return { ...this.workSession };
  }

  public clearWorkSession(): void {
    this.workSession = { ...this.defaultWorkSession };
    this.saveWorkSession();
    (window as any).puestoSeleccionado = null;
    
    // Clear UI elements
    const searchInput = document.getElementById("searchInput") as HTMLInputElement;
    if (searchInput) searchInput.value = "";
    
    const companyInput = document.getElementById("buscarCompania") as HTMLInputElement;
    if (companyInput) {
      companyInput.value = "";
      delete companyInput.dataset.selectedCpy;
    }
    
    const facilityInput = document.getElementById("facility") as HTMLInputElement;
    if (facilityInput) {
      facilityInput.value = "";
      delete facilityInput.dataset.facilityCode;
    }
  }

  public selectTheme(theme: string): void {
    if (this.themes[theme]) {
      this.preferences.theme = theme;
      this.applyTheme();
    }
  }

  public selectBackground(background: string): void {
    if (this.backgrounds[background]) {
      this.preferences.background = background;
      this.preferences.backgroundImage = null;
      this.applyTheme();
    }
  }

  public setBackgroundImage(imageDataUrl: string): void {
    this.preferences.backgroundImage = imageDataUrl;
    this.preferences.background = 'custom';
    this.applyTheme();
  }

  public setCustomLogo(imageDataUrl: string): void {
    this.preferences.customLogo = imageDataUrl;
    this.applyTheme();
  }

  public resetLogo(): void {
    this.preferences.customLogo = null;
    this.applyTheme();
  }

  public resetToDefaults(): void {
    this.preferences = { ...this.defaultPreferences };
    this.applyTheme();
    this.savePreferences();
  }

  public setPageSize(pageSize: number): void {
    this.preferences.pageSize = pageSize;
    this.savePreferences();
  }

  public getPageSize(): number {
    return this.preferences.pageSize || 50;
  }

  private attachEventListeners(): void {
    // Settings dropdown toggle
    const settingsToggle = document.getElementById('settingsToggle') as HTMLButtonElement;
    const settingsMenu = document.getElementById('settingsMenu') as HTMLElement;
    
    if (settingsToggle && settingsMenu) {
      settingsToggle.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        settingsMenu.classList.remove('active');
      });

      settingsMenu.addEventListener('click', (e: Event) => {
        e.stopPropagation();
      });
    }

    // Open preferences modal
    const openPreferences = document.getElementById('openPreferences') as HTMLButtonElement;
    const preferencesModal = document.getElementById('preferencesModal') as HTMLElement;
    
    if (openPreferences && preferencesModal) {
      openPreferences.addEventListener('click', () => {
        preferencesModal.classList.add('active');
        if (settingsMenu) settingsMenu.classList.remove('active');
      });
    }

    // Close preferences modal
    const closePreferences = document.getElementById('closePreferences') as HTMLButtonElement;
    if (closePreferences && preferencesModal) {
      closePreferences.addEventListener('click', () => {
        preferencesModal.classList.remove('active');
      });
    }

    // Close modal when clicking backdrop
    if (preferencesModal) {
      preferencesModal.addEventListener('click', (e: Event) => {
        if (e.target === preferencesModal) {
          preferencesModal.classList.remove('active');
        }
      });
    }

    // Theme selection
    document.querySelectorAll('#colorThemes .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.addEventListener('click', () => {
        const theme = element.dataset.theme;
        if (theme) this.selectTheme(theme);
      });
    });

    // Background selection
    document.querySelectorAll('#backgroundOptions .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.addEventListener('click', () => {
        const background = element.dataset.bg;
        if (background) this.selectBackground(background);
      });
    });

    // Background image upload
    const backgroundUpload = document.getElementById('backgroundUpload') as HTMLInputElement;
    if (backgroundUpload) {
      backgroundUpload.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            const result = e.target?.result as string;
            if (result) this.setBackgroundImage(result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Logo upload
    const logoUpload = document.getElementById('logoUpload') as HTMLInputElement;
    if (logoUpload) {
      logoUpload.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: ProgressEvent<FileReader>) => {
            const result = e.target?.result as string;
            if (result) this.setCustomLogo(result);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Reset logo
    const resetLogo = document.getElementById('resetLogo') as HTMLButtonElement;
    if (resetLogo) {
      resetLogo.addEventListener('click', () => {
        this.resetLogo();
      });
    }

    // Reset settings
    const resetSettings = document.getElementById('resetSettings') as HTMLButtonElement;
    if (resetSettings) {
      resetSettings.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres restablecer todas las preferencias?')) {
          this.resetToDefaults();
        }
      });
    }

    // Page size selection (now in hamburger menu)
    const pageSizeMenuSelect = document.getElementById('pageSizeMenuSelect') as HTMLSelectElement;
    if (pageSizeMenuSelect) {
      // Set current value with fallback for undefined pageSize
      const currentPageSize = this.preferences.pageSize || 50;
      pageSizeMenuSelect.value = currentPageSize.toString();
      
      pageSizeMenuSelect.addEventListener('change', () => {
        const pageSize = parseInt(pageSizeMenuSelect.value);
        this.setPageSize(pageSize);
        
        // Refresh table with new page size if data is available
        if ((window as any).refreshCurrentTable) {
          (window as any).refreshCurrentTable(1, pageSize); // Reset to page 1 with new size
        }
      });
    }

    // Save preferences
    const savePreferences = document.getElementById('savePreferences') as HTMLButtonElement;
    if (savePreferences && preferencesModal) {
      savePreferences.addEventListener('click', () => {
        this.savePreferences();
        preferencesModal.classList.remove('active');
        
        // Show success message
        const originalText = savePreferences.textContent;
        savePreferences.textContent = '✅ Guardado!';
        savePreferences.style.background = '#28a745';
        
        setTimeout(() => {
          if (originalText) savePreferences.textContent = originalText;
          savePreferences.style.background = 'var(--theme-primary)';
        }, 2000);
      });
    }
  }

  // Public getters for accessing current preferences
  public getCurrentTheme(): string {
    return this.preferences.theme;
  }

  public getCurrentBackground(): string {
    return this.preferences.background;
  }

  public getPreferences(): UserPreferencesData {
    return { ...this.preferences };
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.userPreferences = new UserPreferences();
});

// Export for module system
export { UserPreferences, WorkSessionData, UserPreferencesData };