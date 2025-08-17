import { UserPreferences } from './PreferencesHandler.js';

declare global {
  interface Window {
    pdfjsLib: any;
    PDFLib: {
      PDFDocument: any;
      // si usás más cosas, agregalas acá
    };
    userPreferences: UserPreferences;
    puestoSeleccionado: string | null;
    showFieldsAssociatedWithPuesto1: () => void;
    Puestos: any;
    remitosHandler: any;
    tableHandler: any;
  }
}

declare const pdfjsLib: any;
declare const PDFLib: {
  PDFDocument: any;
};

export {};
