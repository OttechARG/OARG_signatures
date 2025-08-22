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
  customThemeColor: string | null;
  customBackgroundColor: string | null;
  pageSize: number;
}

interface WorkSessionData {
  selectedPosition: string | null;
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
  private hasAutoReloaded: boolean = false; // Prevent multiple auto-reloads

  constructor() {
    this.defaultPreferences = {
      theme: 'default',
      background: 'white',
      backgroundImage: null,
      customLogo: null,
      customThemeColor: null,
      customBackgroundColor: null,
      pageSize: 50
    };

    this.defaultWorkSession = {
      selectedPosition: null,
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

  private async init(): Promise<void> {
    await this.loadPreferences();
    this.loadWorkSession();
    this.attachEventListeners();
    this.applyTheme();
    this.restoreWorkSessionUI();
  }

  private async loadPreferences(): Promise<void> {
    try {
      const response = await fetch('/api/visual-preferences');
      if (response.ok) {
        const saved = await response.json();
        // Merge with defaults to handle missing properties
        this.preferences = { ...this.defaultPreferences, ...saved };
      } else {
        this.preferences = { ...this.defaultPreferences };
      }
    } catch (error) {
      console.error('Error al cargar las preferencias:', error);
      this.preferences = { ...this.defaultPreferences };
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      const response = await fetch('/api/visual-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.preferences)
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar las preferencias');
      }
    } catch (error) {
      console.error('Error al guardar las preferencias:', error);
    }
  }

  private loadWorkSession(): void {
    try {
      const saved = sessionStorage.getItem('workSession');
      this.workSession = saved ? JSON.parse(saved) : { ...this.defaultWorkSession };
    } catch (error) {
      console.error('Error al cargar la sesión de trabajo:', error);
      this.workSession = { ...this.defaultWorkSession };
    }
  }

  private saveWorkSession(): void {
    try {
      sessionStorage.setItem('workSession', JSON.stringify(this.workSession));
    } catch (error) {
      console.error('Error al guardar la sesión de trabajo:', error);
    }
  }

  private applyTheme(): void {
    const root = document.documentElement;
    
    // Apply custom theme color if available, otherwise use predefined theme
    if (this.preferences.customThemeColor) {
      const customColor = this.validateAndFormatHexColor(this.preferences.customThemeColor);
      if (customColor) {
        root.style.setProperty('--theme-primary', customColor);
        root.style.setProperty('--theme-primary-light', this.lightenColor(customColor, 20));
        root.style.setProperty('--theme-primary-hover', this.darkenColor(customColor, 20));
      }
    } else {
      const theme = this.themes[this.preferences.theme];
      if (theme) {
        root.style.setProperty('--theme-primary', theme.primary);
        root.style.setProperty('--theme-primary-light', theme.primaryLight);
        root.style.setProperty('--theme-primary-hover', theme.primaryHover);
      }
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
    } else if (this.preferences.customBackgroundColor) {
      root.style.setProperty('--background-image', 'none');
      root.style.setProperty('--background-color', this.preferences.customBackgroundColor);
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
    // Update theme selection - clear if custom theme color is set
    document.querySelectorAll('#colorThemes .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.classList.remove('selected');
      if (!this.preferences.customThemeColor && element.dataset.theme === this.preferences.theme) {
        element.classList.add('selected');
      }
    });

    // Update custom theme color inputs
    const customThemeInput = document.getElementById('customThemeCode') as HTMLInputElement;
    const customThemePicker = document.getElementById('customThemePicker') as HTMLInputElement;
    const themePreview = document.getElementById('themePreview') as HTMLElement;
    
    if (customThemeInput) {
      customThemeInput.value = this.preferences.customThemeColor || '';
    }
    if (customThemePicker) {
      customThemePicker.value = this.preferences.customThemeColor || '#3B82F6';
    }
    if (themePreview) {
      themePreview.style.background = this.preferences.customThemeColor || '#3B82F6';
      if (this.preferences.customThemeColor) {
        themePreview.classList.add('selected');
      } else {
        themePreview.classList.remove('selected');
      }
    }

    // Update custom background color inputs
    const customBackgroundInput = document.getElementById('customBackgroundCode') as HTMLInputElement;
    const customBackgroundPicker = document.getElementById('customBackgroundPicker') as HTMLInputElement;
    const backgroundPreview = document.getElementById('backgroundPreview') as HTMLElement;
    
    if (customBackgroundInput) {
      customBackgroundInput.value = this.preferences.customBackgroundColor || '';
    }
    if (customBackgroundPicker) {
      customBackgroundPicker.value = this.preferences.customBackgroundColor || '#F3F4F6';
    }
    if (backgroundPreview) {
      backgroundPreview.style.background = this.preferences.customBackgroundColor || '#F3F4F6';
      if (this.preferences.customBackgroundColor) {
        backgroundPreview.classList.add('selected');
      } else {
        backgroundPreview.classList.remove('selected');
      }
    }

    // Update background selection - clear if custom background color or image is set
    document.querySelectorAll('#backgroundOptions .color-option').forEach((option: Element) => {
      const element = option as HTMLElement;
      element.classList.remove('selected');
      if (!this.preferences.customBackgroundColor && !this.preferences.backgroundImage && element.dataset.bg === this.preferences.background) {
        element.classList.add('selected');
      }
    });
  }

  private validateAndFormatHexColor(color: string): string | null {
    // Remove # if present and validate format
    const cleanColor = color.replace('#', '');
    const hexRegex = /^[0-9A-Fa-f]{6}$/;
    
    if (hexRegex.test(cleanColor)) {
      return '#' + cleanColor.toUpperCase();
    }
    return null;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  private restoreWorkSessionUI(): void {
    // Restore puesto selection using new button system
    if (this.workSession.selectedPosition) {
      console.log("Restoring puesto from session:", this.workSession.selectedPosition);
      (window as any).selectedPosition = this.workSession.selectedPosition;
      
      // Trigger puesto-related UI logic after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.triggerPuestoLogic(this.workSession.selectedPosition!);
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

    // Auto-reload table if all data is available, but only once per page load
    if (this.workSession.selectedPosition && 
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
            pageSize,
            'no-firmados'
          );
          (window as any).tableHandler.currentParams = { 
            company: this.workSession.selectedCompany, 
            facility: this.workSession.selectedFacility, 
            fechaDesde 
          };
          (window as any).tableHandler.renderTable(result.remitos, result.pagination, result.columns);
          
          // Ensure "No" filter is selected after auto-reload
          setTimeout(() => {
            const filterContainer = document.querySelector('.firmado-filter-options[data-col="4"]') as HTMLElement;
            if (filterContainer) {
              // Remove selected class from all options
              filterContainer.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('selected'));
              // Add selected class to "No" option
              const noOption = filterContainer.querySelector('.filter-option[data-value="no-firmados"]') as HTMLElement;
              if (noOption) {
                noOption.classList.add('selected');
              }
            }
          }, 100);
          
          console.log('Table auto-reloaded successfully');
        }
      }, 500);
    } catch (error) {
      console.error('Error al recargar automáticamente la tabla:', error);
    }
  }

  // Work Session Management Methods
  public setPuesto(puesto: string | null): void {
    this.workSession.selectedPosition = puesto;
    this.saveWorkSession();
    (window as any).selectedPosition = puesto;
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
    (window as any).selectedPosition = null;
    
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
      this.preferences.customThemeColor = null; // Clear custom theme color when selecting predefined theme
      this.applyTheme();
    }
  }

  public setCustomThemeColor(colorCode: string): void {
    const validColor = this.validateAndFormatHexColor(colorCode);
    if (validColor) {
      this.preferences.customThemeColor = validColor;
      this.preferences.theme = 'custom';
      this.updateThemeColorUI(validColor);
      this.applyTheme();
    }
  }

  public setCustomBackgroundColor(colorCode: string): void {
    const validColor = this.validateAndFormatHexColor(colorCode);
    if (validColor) {
      this.preferences.customBackgroundColor = validColor;
      this.preferences.background = 'custom';
      this.preferences.backgroundImage = null;
      this.updateBackgroundColorUI(validColor);
      this.applyTheme(); // This calls applyBackground internally
    }
  }

  private updateThemeColorUI(color: string): void {
    const themeInput = document.getElementById('customThemeCode') as HTMLInputElement;
    const themePicker = document.getElementById('customThemePicker') as HTMLInputElement;
    const themePreview = document.getElementById('themePreview') as HTMLElement;
    
    if (themeInput) themeInput.value = color;
    if (themePicker) themePicker.value = color;
    if (themePreview) {
      themePreview.style.background = color;
      themePreview.classList.add('selected');
    }
  }

  private updateBackgroundColorUI(color: string): void {
    const backgroundInput = document.getElementById('customBackgroundCode') as HTMLInputElement;
    const backgroundPicker = document.getElementById('customBackgroundPicker') as HTMLInputElement;
    const backgroundPreview = document.getElementById('backgroundPreview') as HTMLElement;
    
    if (backgroundInput) backgroundInput.value = color;
    if (backgroundPicker) backgroundPicker.value = color;
    if (backgroundPreview) {
      backgroundPreview.style.background = color;
      backgroundPreview.classList.add('selected');
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

  public async resetToDefaults(): Promise<void> {
    this.preferences = { ...this.defaultPreferences };
    this.applyTheme();
    await this.savePreferences();
  }

  public async setPageSize(pageSize: number): Promise<void> {
    this.preferences.pageSize = pageSize;
    await this.savePreferences();
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

    // Custom theme color picker
    const customThemePicker = document.getElementById('customThemePicker') as HTMLInputElement;
    if (customThemePicker) {
      customThemePicker.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.setCustomThemeColor(target.value);
      });
    }

    // Custom theme color input
    const customThemeInput = document.getElementById('customThemeCode') as HTMLInputElement;
    if (customThemeInput) {
      customThemeInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        let value = target.value.trim();
        
        if (value === '') {
          this.preferences.customThemeColor = null;
          this.preferences.theme = 'default';
          this.applyTheme();
          return;
        }
        
        // Auto-add # if not present
        if (value.length === 6 && !value.startsWith('#')) {
          value = '#' + value;
          target.value = value;
        }
        
        if (value.length === 7 && value.startsWith('#')) {
          this.setCustomThemeColor(value);
        }
      });
    }

    // Custom background color picker
    const customBackgroundPicker = document.getElementById('customBackgroundPicker') as HTMLInputElement;
    if (customBackgroundPicker) {
      customBackgroundPicker.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.setCustomBackgroundColor(target.value);
      });
    }

    // Custom background color input
    const customBackgroundInput = document.getElementById('customBackgroundCode') as HTMLInputElement;
    if (customBackgroundInput) {
      customBackgroundInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        let value = target.value.trim();
        
        if (value === '') {
          this.preferences.customBackgroundColor = null;
          this.preferences.background = 'white';
          this.applyTheme();
          return;
        }
        
        // Auto-add # if not present
        if (value.length === 6 && !value.startsWith('#')) {
          value = '#' + value;
          target.value = value;
        }
        
        if (value.length === 7 && value.startsWith('#')) {
          this.setCustomBackgroundColor(value);
        }
      });
    }

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
      resetSettings.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres restablecer todas las preferencias?')) {
          await this.resetToDefaults();
        }
      });
    }

    // Page size selection (now in hamburger menu)
    const pageSizeMenuSelect = document.getElementById('pageSizeMenuSelect') as HTMLSelectElement;
    if (pageSizeMenuSelect) {
      // Set current value with fallback for undefined pageSize
      const currentPageSize = this.preferences.pageSize || 50;
      pageSizeMenuSelect.value = currentPageSize.toString();
      
      pageSizeMenuSelect.addEventListener('change', async () => {
        const pageSize = parseInt(pageSizeMenuSelect.value);
        await this.setPageSize(pageSize);
        
        // Only refresh table if we have complete session data AND table has been rendered at least once
        if ((window as any).refreshCurrentTable && 
            this.workSession.selectedCompany && 
            this.workSession.selectedFacility &&
            (window as any).tableHandler?.currentParams) {
          (window as any).refreshCurrentTable(1, pageSize); // Reset to page 1 with new size
        }
      });
    }

    // Save preferences
    const savePreferences = document.getElementById('savePreferences') as HTMLButtonElement;
    if (savePreferences && preferencesModal) {
      savePreferences.addEventListener('click', async () => {
        await this.savePreferences();
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
document.addEventListener('DOMContentLoaded', async () => {
  window.userPreferences = new UserPreferences();
});

// Export for module system
export { UserPreferences, WorkSessionData, UserPreferencesData };