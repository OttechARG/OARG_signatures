import { createButton } from './ButtonsHandler.js';
import { GET_COMPANIES, queryFacilities, queryRemitos } from "./graphql/queries.js";
import { Puestos } from "./HiddenValues.js";
import { SettingsMenuHandler } from './SettingsMenuHandler.js';
import { RemitosHandler } from './RemitosHandler.js';
import { TableHandler } from "./TableHandler.js";
import { setPdfContainer, setCurrentPage } from './PDFHandler.js';

const pdfContainerEl = document.getElementById("pdfContainer") as HTMLDivElement;
setPdfContainer(pdfContainerEl);

const puestos = Puestos.lista;
const formContainer = document.getElementById("formContainer") as HTMLDivElement;

// Initialize puesto buttons
function initializePuestoButtons() {
  const btnPuesto0 = document.getElementById("btnPuesto0") as HTMLButtonElement;
  const btnPuesto1 = document.getElementById("btnPuesto1") as HTMLButtonElement;
  
  if (btnPuesto0) {
    btnPuesto0.textContent = Puestos.lista[0];
    btnPuesto0.addEventListener("click", () => handlePuestoSelection(Puestos.lista[0]));
  }
  
  if (btnPuesto1) {
    btnPuesto1.textContent = Puestos.lista[1];
    btnPuesto1.addEventListener("click", () => handlePuestoSelection(Puestos.lista[1]));
    // Hide the "Hoja de ruta" button while preserving its logic
    btnPuesto1.style.display = "none";
  }
}

// Handle puesto selection (extracted from previous logic)
function handlePuestoSelection(selectedPuesto: string) {
  // Update button visual state
  updatePuestoButtonSelection(selectedPuesto);
  
  // Use new session storage method with safety check
  if (window.userPreferences) {
    window.userPreferences.setPuesto(selectedPuesto);
  }
  
  if (selectedPuesto === Puestos.lista[0]) { // "Punto de Venta Entregas"
    showFieldsAssociatedWithPuesto1();
    if (window.userPreferences) {
      window.userPreferences.setCompanyFieldVisibility(true);
    }
  } else {
    if (window.userPreferences) {
      window.userPreferences.setCompanyFieldVisibility(false);
    }
    // Clear dynamic fields when switching to other puestos
    const dynamicFields = document.getElementById("dynamicFields");
    if (dynamicFields) {
      dynamicFields.innerHTML = "";
    }
    // Reset input references
    buscarCompaniaInput = null;
    facilityInput = null;
    // Create save button for non-"punto de venta entregas" puestos
    createSaveButton();
  }
}

// Update visual state of puesto buttons
function updatePuestoButtonSelection(selectedPuesto: string) {
  const btnPuesto0 = document.getElementById("btnPuesto0") as HTMLButtonElement;
  const btnPuesto1 = document.getElementById("btnPuesto1") as HTMLButtonElement;
  
  // Remove selected class from all buttons
  btnPuesto0?.classList.remove("selected");
  btnPuesto1?.classList.remove("selected");
  
  // Add selected class to the clicked button
  if (selectedPuesto === Puestos.lista[0]) {
    btnPuesto0?.classList.add("selected");
  } else if (selectedPuesto === Puestos.lista[1]) {
    btnPuesto1?.classList.add("selected");
  }
}

let buscarCompaniaInput: HTMLInputElement | null = null;
let facilityInput: HTMLInputElement | null = null;

const menuHandler = new SettingsMenuHandler('menuToggle', 'sideMenu');
const remitosHandler = new RemitosHandler();
const tableHandler = new TableHandler("remitosTable");
const fechaDesdeInput = document.getElementById("fechaDesde") as HTMLInputElement;

// Dynamic save button management
function createSaveButton() {
  const existingButton = document.getElementById("btnSaveSelection");
  if (existingButton) {
    existingButton.remove();
  }

  const workSession = window.userPreferences.getWorkSession();
  const currentPuesto = workSession.selectedPosition;
  
  // Define requirements based on puesto
  const getRequirementsForPuesto = (puesto: string) => {
    if (puesto === Puestos.lista[0]) { // "Punto de Venta Entregas"
      return {
        requiresCompany: true,
        requiresFacility: true,
        isAvailable: true,
        message: "Debes seleccionar un puesto, empresa y planta para guardar."
      };
    } else if (puesto === Puestos.lista[1]) { // "Hoja de ruta" is not available
      return {
        requiresCompany: false,
        requiresFacility: false,
        isAvailable: false,
        message: `${Puestos.lista[1]} no está disponible.`
      };
    } else {
      return {
        requiresCompany: false,
        requiresFacility: false,
        isAvailable: true,
        message: "Debes seleccionar un puesto para guardar."
      };
    }
  };

  const requirements = getRequirementsForPuesto(currentPuesto || "");

  createButton(formContainer, {
    id: "btnSaveSelection",
    text: "Guardar Selección",
    onClick: async () => {
      const workSession = window.userPreferences.getWorkSession();
      const fechaDesde: string | undefined = fechaDesdeInput?.value || undefined;
      
      console.log("Datos a enviar:", { 
        puesto: workSession.selectedPosition, 
        company: workSession.selectedCompany, 
        facility: workSession.selectedFacility, 
        fechaDesde 
      });
      
      // Check if puesto is available
      if (!requirements.isAvailable) {
        alert(requirements.message);
        return;
      }
      
      // Dynamic validation based on requirements
      const missingFields = [];
      
      // Check puesto session storage (no input field anymore, just buttons)
      if (!workSession.selectedPosition) {
        missingFields.push("position");
      }
      
      // Check actual input field values, not just session storage
      if (requirements.requiresCompany) {
        const companyInputValue = buscarCompaniaInput?.value?.trim();
        if (!companyInputValue || !workSession.selectedCompany) {
          missingFields.push("company");
        }
      }
      
      if (requirements.requiresFacility) {
        const facilityInputValue = facilityInput?.value?.trim();
        if (!facilityInputValue || !workSession.selectedFacility) {
          missingFields.push("facility");
        }
      }
      
      if (missingFields.length > 0) {
        alert(requirements.message);
        return;
      }

      const dataToSave = { 
        puesto: workSession.selectedPosition, 
        company: workSession.selectedCompany, 
        facility: workSession.selectedFacility 
      };
      
      // Only fetch remitos if company and facility are available
      if (workSession.selectedCompany && workSession.selectedFacility) {
        const pageSize = window.userPreferences?.getPageSize() || 50;
        const result = await remitosHandler.fetchRemitos(workSession.selectedCompany, workSession.selectedFacility, fechaDesde, 1, pageSize, 'no-firmados');
        tableHandler.currentParams = { company: workSession.selectedCompany, facility: workSession.selectedFacility, fechaDesde };
        tableHandler.renderTable(result.remitos, result.pagination);
      }
      
      sessionStorage.setItem("userSelection", JSON.stringify(dataToSave));
      alert("Selección guardada en la sesión.");
      // Close the side menu and show table view
      menuHandler.toggleMenu();
    },
    
    style: { marginTop: "10px", padding: "8px 16px", alignSelf: "center" }
  });
}


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem("pdfToSign")) {
    sessionStorage.removeItem("pdfToSign");
    console.log("pdfToSign eliminado de la sesión");
  }
  initializePuestoButtons();
  setDefaultDate();
});

// Set default date and restore from session
function setDefaultDate() {
  const fechaDesdeInput = document.getElementById("fechaDesde") as HTMLInputElement;
  if (!fechaDesdeInput) return;
  
  // First, try to restore from session storage
  const savedDate = sessionStorage.getItem("fechaDesde");
  if (savedDate) {
    fechaDesdeInput.value = savedDate;
    console.log("Date restored from session:", savedDate);
  } else if (!fechaDesdeInput.value) {
    // Only set to current date if no saved date and no value
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    fechaDesdeInput.value = formattedDate;
    sessionStorage.setItem("fechaDesde", formattedDate);
    console.log("Default date set to:", formattedDate);
  }
  
  // Add listener to save date changes to session storage
  fechaDesdeInput.addEventListener('change', () => {
    sessionStorage.setItem("fechaDesde", fechaDesdeInput.value);
    console.log("Date saved to session:", fechaDesdeInput.value);
  });
}

window.addEventListener('message', async (event) => {
  if (event.data.type === 'PDF_SIGNED') {
    console.log('PDF firmado, actualizando tabla...', event.data);
    
    // Obtener selección actual del usuario
    const savedSelection = sessionStorage.getItem("userSelection");
    if (savedSelection) {
      const { company, facility } = JSON.parse(savedSelection);
      const fechaDesde = fechaDesdeInput?.value || undefined;
      
      // Refrescar la tabla con datos actualizados
      try {
        const pageSize = window.userPreferences?.getPageSize() || 50;
        const result = await remitosHandler.fetchRemitos(company, facility, fechaDesde, 1, pageSize, 'no-firmados');
        tableHandler.currentParams = { company, facility, fechaDesde };
        tableHandler.renderTable(result.remitos, result.pagination);
        console.log('Tabla actualizada exitosamente');
      } catch (error) {
        console.error('Error actualizando tabla:', error);
      }
    }
  }
});

// Old input event handlers removed - now using puesto buttons


let listaCompletaCompanias: { CPY_0: string; CPYNAM_0: string }[] = [];
let listaCompletaFacilities: { FCY_0: string; FCYSHO_0: string }[] = [];

// Make function and handlers globally accessible
window.showFieldsAssociatedWithPuesto1 = showFieldsAssociatedWithPuesto1;
window.Puestos = Puestos;
window.remitosHandler = remitosHandler;
window.tableHandler = tableHandler;
window.refreshCurrentTable = (page: number = 1, pageSize?: number) => {
  const currentPageSize = pageSize || window.userPreferences?.getPageSize() || 50;
  tableHandler.refreshWithPageSize(page, currentPageSize);
};

function showFieldsAssociatedWithPuesto1() {
  if (!buscarCompaniaInput) {
    // Contenedor para buscar compañía + lista
    const divBuscarCompania = document.createElement("div");
    divBuscarCompania.style.position = "relative";

    const labelBuscarCompania = document.createElement("label");
    labelBuscarCompania.htmlFor = "buscarCompania";
    // labelBuscarCompania.textContent = "Compañía:"; // opcional
    
    buscarCompaniaInput = document.createElement("input");
    buscarCompaniaInput.type = "text";
    buscarCompaniaInput.id = "buscarCompania";
    buscarCompaniaInput.name = "buscarCompania";
    buscarCompaniaInput.placeholder = "Ingrese compañía";
    buscarCompaniaInput.classList.add("input-box");

    const listaCompanias = document.createElement("ul");
    listaCompanias.id = "companiasList";
    listaCompanias.style.position = "absolute";
    listaCompanias.style.top = "100%";
    listaCompanias.style.left = "0";
    listaCompanias.style.right = "0";
    listaCompanias.style.backgroundColor = "white";
    listaCompanias.style.border = "1px solid #ccc";
    listaCompanias.style.maxHeight = "150px";
    listaCompanias.style.overflowY = "scroll";
    listaCompanias.style.zIndex = "1000";
    listaCompanias.style.listStyle = "none";
    listaCompanias.style.padding = "0";
    listaCompanias.style.margin = "0";
    listaCompanias.style.display = "none";

    divBuscarCompania.appendChild(labelBuscarCompania);
    divBuscarCompania.appendChild(buscarCompaniaInput);
    divBuscarCompania.appendChild(listaCompanias);

    // Contenedor para facility + lista
    const divFacility = document.createElement("div");
    divFacility.style.position = "relative";

    const labelFacility = document.createElement("label");
    labelFacility.htmlFor = "facility";
    // labelFacility.textContent = "Facility:"; // opcional

    facilityInput = document.createElement("input");
    facilityInput.type = "text";
    facilityInput.id = "facility";
    facilityInput.name = "facility";
    facilityInput.placeholder = "Ingrese planta";
    facilityInput.classList.add("input-box");

    const listaFacilities = document.createElement("ul");
    listaFacilities.id = "facilitiesList";
    listaFacilities.style.position = "absolute";
    listaFacilities.style.top = "100%";
    listaFacilities.style.left = "0";
    listaFacilities.style.right = "0";
    listaFacilities.style.backgroundColor = "white";
    listaFacilities.style.border = "1px solid #ccc";
    listaFacilities.style.maxHeight = "150px";
    listaFacilities.style.overflowY = "scroll";
    listaFacilities.style.zIndex = "1000";
    listaFacilities.style.listStyle = "none";
    listaFacilities.style.padding = "0";
    listaFacilities.style.margin = "0";
    listaFacilities.style.display = "none";

    divFacility.appendChild(labelFacility);
    divFacility.appendChild(facilityInput);
    divFacility.appendChild(listaFacilities);

     // Agrego los divs al contenedor principal
    const dynamicFields = document.getElementById("dynamicFields");
    if (dynamicFields) {
        dynamicFields.innerHTML = ""; // limpio solo lo dinámico
        dynamicFields.appendChild(divBuscarCompania);
        dynamicFields.appendChild(divFacility);
    }

     // Create dynamic save button
    createSaveButton();
    

   

    
    // Función para mostrar lista de compañías
    function mostrarCompaniasEnLista(companias: { CPY_0: string; CPYNAM_0: string }[]) {
      console.log("Mostrar compañías:", companias);
      listaCompanias.innerHTML = "";
      if (companias.length === 0) {
        listaCompanias.style.display = "none";
        return;
      }
      for (const c of companias) {
        const li = document.createElement("li");
        li.textContent = c.CPYNAM_0;
        li.dataset.cpyCode = c.CPY_0;  // guardamos el código real en el LI
        li.style.padding = "5px";
        li.style.cursor = "pointer";

        li.addEventListener("click", () => {
          buscarCompaniaInput!.value = c.CPYNAM_0;
          buscarCompaniaInput!.dataset.selectedCpy = c.CPY_0;

          // Save to session storage
          window.userPreferences.setCompany(c.CPY_0, c.CPYNAM_0);

          listaCompanias.style.display = "none";

          cargarFacilities();
        });

        listaCompanias.appendChild(li);
      }
      listaCompanias.style.display = "block";
    }

    // Función para mostrar lista de facilities
    function mostrarFacilitiesEnLista(facilities: { FCY_0: string; FCYSHO_0: string }[]) {
      console.log("Mostrar facilities:", facilities);
      listaFacilities.innerHTML = "";
      if (facilities.length === 0) {
        listaFacilities.style.display = "none";
        return;
      }
      for (const f of facilities) {
        const li = document.createElement("li");
        li.textContent = `${f.FCYSHO_0} ${f.FCY_0}`;
        li.style.padding = "5px";
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
          facilityInput!.value = `${f.FCYSHO_0} (${f.FCY_0})`
          facilityInput!.dataset.facilityCode = f.FCY_0;
          
          // Save to session storage
          window.userPreferences.setFacility(f.FCY_0, `${f.FCYSHO_0} (${f.FCY_0})`);
          
          listaFacilities.style.display = "none";
        });
        listaFacilities.appendChild(li);
      }
      listaFacilities.style.display = "block";
    }

 
    
async function consultarCompanias() {
  try {
    const response = await fetch('/graphql', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: GET_COMPANIES }),
    });

    const { data, errors } = await response.json();
    if (errors) {
      console.error("GraphQL errors:", errors);
      listaCompletaCompanias = [];
      mostrarCompaniasEnLista([]);
      return;
    }

    listaCompletaCompanias = data.companies || [];
    mostrarCompaniasEnLista(listaCompletaCompanias);

  } catch (err) {
    console.error("Error consultarCompanias:", err);
    listaCompletaCompanias = [];
    mostrarCompaniasEnLista([]);
  }
}
   
  async function cargarFacilities() {
      try {
          if (!buscarCompaniaInput) return;

          const cpyCode = buscarCompaniaInput.dataset.selectedCpy;
          if (!cpyCode) {
          console.warn("No se seleccionó un código válido para la compañía");
          return;
          }

          const response = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              query: queryFacilities,
              variables: { legcpy: cpyCode }
          })
          });

          const { data, errors } = await response.json();
          if (errors) {
          console.error('GraphQL errors:', errors);
          listaCompletaFacilities = [];
          return;
          }

          listaCompletaFacilities = data.facilities || [];

      } catch (err) {
          console.error('Error cargarFacilities:', err);
      }
    }

    // Eventos para buscarCompaniaInput
    buscarCompaniaInput.addEventListener("focus", () => {
        console.log("buscarCompaniaInput focus");
        if (listaCompletaCompanias.length === 0) {
            consultarCompanias();
        } else {
            mostrarCompaniasEnLista(listaCompletaCompanias);
        }
        });

    buscarCompaniaInput.addEventListener("input", () => {
      const texto = buscarCompaniaInput!.value.toLowerCase();
      console.log("buscarCompaniaInput input:", texto);
      const filtradas = listaCompletaCompanias.filter(c =>
        c.CPYNAM_0.toLowerCase().includes(texto)
      );
      mostrarCompaniasEnLista(filtradas);
    });

    buscarCompaniaInput.addEventListener("blur", () => {
      console.log("buscarCompaniaInput blur");
      setTimeout(() => {
        listaCompanias.style.display = "none";
      }, 150);
    });

    // Eventos para facilityInput
    facilityInput.addEventListener("input", () => {
      const texto = facilityInput!.value.toLowerCase();
      console.log("facilityInput input:", texto);
      const filtradas = listaCompletaFacilities.filter(f =>
        f.FCYSHO_0.toLowerCase().includes(texto) || f.FCY_0.toLowerCase().includes(texto)
      );
      mostrarFacilitiesEnLista(filtradas);
    });

    facilityInput.addEventListener("focus", () => {
      console.log("facilityInput focus");
      if (listaCompletaFacilities.length > 0) {
        mostrarFacilitiesEnLista(listaCompletaFacilities);
      }
    });

    facilityInput.addEventListener("blur", () => {
      console.log("facilityInput blur");
      setTimeout(() => {
        listaFacilities.style.display = "none";
      }, 150);
    });
  } else {
    // Si ya existe el input, podrías resetear o simplemente mostrar (depende tu lógica)
    console.log("Inputs ya creados, no se crean nuevamente");
  }
  
}



  

