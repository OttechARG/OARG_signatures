import { createButton } from './ButtonsHandler.js';
import { GET_COMPANIES, queryFacilities } from "./graphql/queries.js";
import { Puestos } from "./HiddenValues.js";
import { SettingsMenuHandler } from './SettingsMenuHandler.js';
import { RemitosHandler } from './RemitosHandler.js';
import { TableHandler } from "./TableHandler.js";
import { setPdfContainer } from './PDFHandler.js';
const pdfContainerEl = document.getElementById("pdfContainer");
setPdfContainer(pdfContainerEl);
const puestos = Puestos.lista;
window.puestoSeleccionado = null;
const input = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const formContainer = document.getElementById("formContainer");
let buscarCompaniaInput = null;
let facilityInput = null;
const menuHandler = new SettingsMenuHandler('menuToggle', 'sideMenu');
const remitosHandler = new RemitosHandler();
const tableHandler = new TableHandler("remitosTable");
const fechaDesdeInput = document.getElementById("fechaDesde");
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
                const remitos = await remitosHandler.fetchRemitos(company, facility, fechaDesde);
                tableHandler.renderTable(remitos);
                console.log('Tabla actualizada exitosamente');
            }
            catch (error) {
                console.error('Error actualizando tabla:', error);
            }
        }
    }
});
input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    if (!query) {
        suggestionsList.style.display = "none";
        suggestionsList.innerHTML = "";
        return;
    }
    const filtrados = menuHandler.filtrarPuestos(query);
    menuHandler.mostrarSugerenciasPuestos(filtrados, suggestionsList);
});
input.addEventListener("focus", () => {
    if (!input.value) {
        suggestionsList.innerHTML = puestos
            .map(puesto => `<li class="suggestion-item">${puesto}</li>`)
            .join("");
        suggestionsList.style.display = "block";
    }
});
input.addEventListener("blur", () => {
    setTimeout(() => {
        suggestionsList.style.display = "none";
    }, 150);
});
suggestionsList.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.tagName === "LI") {
        input.value = target.textContent || "";
        suggestionsList.style.display = "none";
        suggestionsList.innerHTML = "";
        window.puestoSeleccionado = input.value;
        if (window.puestoSeleccionado === Puestos.lista[0]) { //punto de venta entregas es actualmente.
            showFieldsAssociatedWithPuesto1();
        }
        else {
            menuHandler.setVisibleCompanyField(false);
        }
    }
});
let listaCompletaCompanias = [];
let listaCompletaFacilities = [];
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
        // Crear botón Guardar
        createButton(formContainer, {
            id: "btnSaveSelection",
            text: "Save Selection",
            onClick: async () => {
                const puesto = window.puestoSeleccionado || null;
                const company = buscarCompaniaInput.dataset.selectedCpy || null;
                const facility = facilityInput.dataset.facilityCode || null;
                const fechaDesde = fechaDesdeInput?.value || undefined;
                console.log("Datos a enviar:", { puesto, company, facility, fechaDesde }); // <--- aquí
                if (!puesto || !company || !facility) {
                    alert("You must select a position, company, and facility to save.");
                    return;
                }
                const dataToSave = { puesto, company, facility };
                const remitos = await remitosHandler.fetchRemitos(company, facility, fechaDesde);
                sessionStorage.setItem("userSelection", JSON.stringify(dataToSave));
                alert("Selection saved in session.");
                if (company && facility) {
                    tableHandler.renderTable(remitos);
                }
            },
            style: { marginTop: "10px", padding: "8px 16px", alignSelf: "center" }
        });
        // Función para mostrar lista de compañías
        function mostrarCompaniasEnLista(companias) {
            console.log("Mostrar compañías:", companias);
            listaCompanias.innerHTML = "";
            if (companias.length === 0) {
                listaCompanias.style.display = "none";
                return;
            }
            for (const c of companias) {
                const li = document.createElement("li");
                li.textContent = c.CPYNAM_0;
                li.dataset.cpyCode = c.CPY_0; // guardamos el código real en el LI
                li.style.padding = "5px";
                li.style.cursor = "pointer";
                li.addEventListener("click", () => {
                    buscarCompaniaInput.value = c.CPYNAM_0;
                    buscarCompaniaInput.dataset.selectedCpy = c.CPY_0;
                    listaCompanias.style.display = "none";
                    cargarFacilities();
                });
                listaCompanias.appendChild(li);
            }
            listaCompanias.style.display = "block";
        }
        // Función para mostrar lista de facilities
        function mostrarFacilitiesEnLista(facilities) {
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
                    facilityInput.value = `${f.FCYSHO_0} (${f.FCY_0})`;
                    facilityInput.dataset.facilityCode = f.FCY_0;
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
            }
            catch (err) {
                console.error("Error consultarCompanias:", err);
                listaCompletaCompanias = [];
                mostrarCompaniasEnLista([]);
            }
        }
        async function cargarFacilities() {
            try {
                if (!buscarCompaniaInput)
                    return;
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
            }
            catch (err) {
                console.error('Error cargarFacilities:', err);
            }
        }
        // Eventos para buscarCompaniaInput
        buscarCompaniaInput.addEventListener("focus", () => {
            console.log("buscarCompaniaInput focus");
            if (listaCompletaCompanias.length === 0) {
                consultarCompanias();
            }
            else {
                mostrarCompaniasEnLista(listaCompletaCompanias);
            }
        });
        buscarCompaniaInput.addEventListener("input", () => {
            const texto = buscarCompaniaInput.value.toLowerCase();
            console.log("buscarCompaniaInput input:", texto);
            const filtradas = listaCompletaCompanias.filter(c => c.CPYNAM_0.toLowerCase().includes(texto));
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
            const texto = facilityInput.value.toLowerCase();
            console.log("facilityInput input:", texto);
            const filtradas = listaCompletaFacilities.filter(f => f.FCYSHO_0.toLowerCase().includes(texto) || f.FCY_0.toLowerCase().includes(texto));
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
    }
    else {
        // Si ya existe el input, podrías resetear o simplemente mostrar (depende tu lógica)
        console.log("Inputs ya creados, no se crean nuevamente");
    }
}
