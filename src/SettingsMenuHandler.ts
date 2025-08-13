import { Puestos } from "./HiddenValues.js";

export class SettingsMenuHandler {
  private menuToggle: HTMLElement | null;
  private sideMenu: HTMLElement | null;
    private puestos: string[];

  constructor(toggleId: string, menuId: string) {
    this.menuToggle = document.getElementById(toggleId);
    this.sideMenu = document.getElementById(menuId);
    this.puestos = Puestos.lista;
    this.init();
  }
  
  private init() {
    if (this.menuToggle && this.sideMenu) {
      this.menuToggle.addEventListener('click', () => {
        this.toggleMenu();
      });
    } else {
      console.warn('Menu toggle o side menu no encontrado');
    }
  }

  /** Alterna la visibilidad del menú lateral */
  public toggleMenu() {
    this.sideMenu?.classList.toggle('active');
  }

//---------------------------------------------------------------------------------
//------------------COMPANY FUNCTIONS
//---------------------------------------------------------------------------------
   /* Muestra u oculta el campo "Buscar Compañía"
   * @param show true = mostrar, false = ocultar
   */
  public setVisibleCompanyField(show: boolean) {
    const cont = document.getElementById("buscarCompaniaContainer");
    if (cont) cont.style.display = show ? "block" : "none";
  }


//---------------------------------------------------------------------------------
//------------------PUESTOS FUNCTIONS
//---------------------------------------------------------------------------------
 /** Filtra la lista de puestos según el query */
  public filtrarPuestos(query: string): string[] {
    return this.puestos.filter(puesto =>
      puesto.toLowerCase().includes(query.toLowerCase())
    );
  }

  /** Muestra las sugerencias de puestos en el elemento de lista */
  public mostrarSugerenciasPuestos(filtered: string[], listaElement: HTMLUListElement) {
    if (filtered.length > 0) {
      listaElement.innerHTML = filtered
        .map(puesto => `<li class="suggestion-item">${puesto}</li>`)
        .join("");
      listaElement.style.display = "block";
    } else {
      listaElement.style.display = "none";
      listaElement.innerHTML = "";
    }
  }
}