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
  private themes: ThemeCollection;
  private backgrounds: BackgroundCollection;

  constructor() {
    this.defaultPreferences = {
      theme: 'default',
      background: 'white',
      backgroundImage: null,
      customLogo: null
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
    this.init();
  }

  private init(): void {
    this.loadPreferences();
    this.attachEventListeners();
    this.applyTheme();
  }

  private loadPreferences(): void {
    try {
      const saved = localStorage.getItem('userPreferences');
      this.preferences = saved ? JSON.parse(saved) : { ...this.defaultPreferences };
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
export { UserPreferences };