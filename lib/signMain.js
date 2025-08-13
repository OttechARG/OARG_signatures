import { GET_COMPANIES, queryFacilities, queryRemitos } from "./graphql/queries.js";
import { Puestos } from "./HiddenValues.js";
import { recuperarDocumentoBase64ConReintentos } from "./PDFHandler.js";
import { TableHandler } from './TableHandler.js';
const puestos = Puestos.lista;
window.puestoSeleccionado = null;
const input = document.getElementById("searchInput");
const suggestionsList = document.getElementById("suggestionsList");
const formContainer = document.getElementById("formContainer");
let buscarCompaniaInput = null;
let facilityInput = null;
input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    if (!query) {
        suggestionsList.style.display = "none";
        suggestionsList.innerHTML = "";
        return;
    }
    const filtered = puestos.filter(puesto => puesto.toLowerCase().includes(query));
    if (filtered.length > 0) {
        suggestionsList.innerHTML = filtered
            .map(puesto => `<li class="suggestion-item">${puesto}</li>`)
            .join("");
        suggestionsList.style.display = "block";
    }
    else {
        suggestionsList.style.display = "none";
        suggestionsList.innerHTML = "";
    }
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
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
if (menuToggle && sideMenu) {
    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('active');
    });
}
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
            ocultarCampoBuscarCompania();
        }
        const recuperarBtn = document.getElementById("recuperarDocumentoBtn");
        if (recuperarBtn) {
            recuperarBtn.style.display = "inline-block";
            if (!recuperarBtn.hasAttribute("data-listener-added")) {
                recuperarBtn.addEventListener("click", async () => {
                    if (!remitoSeleccionado) {
                        alert("Por favor seleccione un remito en la tabla antes de recuperar el documento.");
                        return;
                    }
                    const url = `/proxy-getrpt?PCLE=${encodeURIComponent(remitoSeleccionado.remito)}`;
                    try {
                        await recuperarDocumentoBase64ConReintentos(url);
                    }
                    catch (error) {
                        console.error(error);
                        alert(error.message);
                    }
                });
                recuperarBtn.setAttribute("data-listener-added", "true");
            }
        }
    }
});
function ocultarCampoBuscarCompania() {
    const cont = document.getElementById("buscarCompaniaContainer");
    if (cont) {
        cont.style.display = "none";
    }
}
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
        listaCompanias.style.overflowY = "auto";
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
        listaFacilities.style.overflowY = "auto";
        listaFacilities.style.zIndex = "1000";
        listaFacilities.style.listStyle = "none";
        listaFacilities.style.padding = "0";
        listaFacilities.style.margin = "0";
        listaFacilities.style.display = "none";
        divFacility.appendChild(labelFacility);
        divFacility.appendChild(facilityInput);
        divFacility.appendChild(listaFacilities);
        // Crear botón Guardar
        const btnGuardar = document.createElement("button");
        btnGuardar.textContent = "Guardar selección";
        btnGuardar.style.marginTop = "10px";
        btnGuardar.style.padding = "8px 16px";
        btnGuardar.style.alignSelf = "center";
        // Agregar botón al final del formContainer (o donde quieras)
        // Evento click para guardar en sessionStorage
        btnGuardar.addEventListener("click", () => {
            // Asumiendo que tienes una variable global o alguna forma de saber el puesto
            const puesto = window.puestoSeleccionado || null; // reemplazar según tu lógica
            const company = buscarCompaniaInput.dataset.selectedCpy || null;
            const facility = facilityInput.dataset.facilityCode || null;
            if (!puesto || !company || !facility) {
                alert("Debe seleccionar puesto, compañía y planta para guardar.");
                return;
            }
            const dataGuardar = {
                puesto,
                company,
                facility,
            };
            sessionStorage.setItem("seleccionUsuario", JSON.stringify(dataGuardar));
            alert("Selección guardada en sesión.");
            if (company && facility) {
                cargarRemitosEnTabla(company, facility);
            }
        });
        // Agrego los tres divs al contenedor principal
        if (formContainer) {
            formContainer.innerHTML = ""; // limpio todo
            formContainer.appendChild(divBuscarCompania);
            formContainer.appendChild(divFacility);
            formContainer.appendChild(btnGuardar); // <--- Agregalo acá al final
        }
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
// Cuando haces click en botón Guardar
function guardarSeleccion() {
    const puesto = window.puestoSeleccionado;
    const company = buscarCompaniaInput?.dataset.selectedCpy || null;
    const facility = facilityInput?.dataset.facilityCode || null;
    if (!puesto || !company || !facility) {
        alert("Debe seleccionar puesto, compañía y planta para guardar");
        return;
    }
    sessionStorage.setItem("seleccionUsuario", JSON.stringify({ puesto, company, facility }));
    alert("Datos guardados en sesión");
}
function crearBotonGuardar() {
    const formContainer = document.getElementById("formContainer");
    if (!formContainer)
        return;
    if (document.getElementById("btnGuardar"))
        return;
    const btnGuardar = document.createElement("button");
    btnGuardar.id = "btnGuardar";
    btnGuardar.type = "button";
    btnGuardar.textContent = "Guardar Selección";
    btnGuardar.style.marginTop = "15px";
    btnGuardar.style.padding = "10px 20px";
    // Aquí llamamos a la función que maneja la lógica del guardado
    btnGuardar.addEventListener("click", guardarSeleccion);
    formContainer.appendChild(btnGuardar);
}
// Variable global para guardar la selección
let remitoSeleccionado = null;
document.querySelector("#remitosTable")?.addEventListener("click", (e) => {
    const fila = e.target.closest("tr");
    if (!fila)
        return;
    // Sacar clase selected de otras filas
    const tabla = document.getElementById("remitosTable");
    tabla?.querySelectorAll("tr.selected").forEach(tr => tr.classList.remove("selected"));
    // Poner clase selected a la fila clickeada
    fila.classList.add("selected");
    const company = fila.dataset.company;
    const facility = fila.dataset.facility;
    const remito = fila.dataset.remito;
    if (company && facility && remito) {
        remitoSeleccionado = { company, facility, remito };
        console.log("Remito seleccionado:", remitoSeleccionado);
    }
});
async function cargarRemitosEnTabla(company, facility) {
    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: queryRemitos,
                variables: { cpy: company, stofcy: facility }
            })
        });
        const { data, errors } = await response.json();
        console.log("Respuesta completa de GraphQL:", data);
        if (errors) {
            console.error('GraphQL errors:', errors);
            return;
        }
        const remitos = data.remitos || [];
        console.log("Remitos obtenidos:", remitos);
        const tabla = document.getElementById('remitosTable');
        const tbody = tabla.querySelector('tbody');
        tbody.innerHTML = ""; // Limpia tabla
        for (const r of remitos) {
            const tr = document.createElement('tr');
            // Asumiendo que en r están las propiedades adecuadas:
            const numero = r.SDHNUM_0 || "";
            const fecha = r.DLVDAT_0 || "";
            const codCliente = r.BPCORD_0 || "";
            const razonSocial = r.BPDNAM_0 || "";
            // Para la columna firmado, si tienes un campo booleano o estado, adaptá:
            const firmado = r.FIRMADO_0 || false;
            // <-- aquí seteás los data-attributes que usa el click
            tr.dataset.company = r.CPY_0 || r.CPY || "";
            tr.dataset.facility = r.STOFCY_0 || r.STOFAC || ""; // según como venga en tu query
            tr.dataset.remito = String(numero);
            tr.style.cursor = "pointer"; // opcional, para que parezca clickeable
            tr.innerHTML = `
        <td>${numero}</td>
        <td>${fecha}</td>
        <td>${codCliente}</td>
        <td>${razonSocial}</td>
        <td class="${firmado ? 'signed-true' : 'signed-false'}">${firmado ? '✓' : '✗'}</td>
      `;
            tbody.appendChild(tr);
        }
    }
    catch (err) {
        console.error('Error cargando remitos:', err);
    }
    const filterManager = new TableHandler('remitosTable');
    filterManager.setupColumnFilters();
}
