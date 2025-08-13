import { GET_COMPANIES, queryFacilities } from "./graphql/queries.js";
export class SettingsUser {
    constructor(formContainerId) {
        this.buscarCompaniaInput = null;
        this.facilityInput = null;
        this.listaCompletaCompanias = [];
        this.listaCompletaFacilities = [];
        console.log("SettingsUser constructor");
        this.init(formContainerId);
        this.addMenuToggleListener();
    }
    setOnGuardarCallback(cb) {
        this.onGuardarCallback = cb;
        console.log("Callback asignado");
    }
    addMenuToggleListener() {
        const menuToggle = document.getElementById('menuToggle');
        const sideMenu = document.getElementById('sideMenu');
        if (!menuToggle || !sideMenu)
            return;
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.toggle('active');
            console.log("Hamburguesa clickeada");
        });
    }
    init(formContainerId) {
        const container = document.getElementById(formContainerId);
        if (!container)
            throw new Error("Form container no encontrado");
        this.formContainer = container;
        console.log("Form container inicializado");
        this.initForm();
    }
    initForm() {
        this.crearInputs();
        this.crearBotonGuardar();
    }
    crearInputs() {
        console.log("Creando inputs");
        // Buscar compañía
        const divBuscarCompania = document.createElement("div");
        divBuscarCompania.style.position = "relative";
        this.buscarCompaniaInput = document.createElement("input");
        this.buscarCompaniaInput.type = "text";
        this.buscarCompaniaInput.id = "buscarCompania";
        this.buscarCompaniaInput.placeholder = "Ingrese compañía";
        this.buscarCompaniaInput.classList.add("input-box");
        const listaCompanias = document.createElement("ul");
        listaCompanias.id = "companiasList";
        this.estilizarLista(listaCompanias);
        divBuscarCompania.appendChild(this.buscarCompaniaInput);
        divBuscarCompania.appendChild(listaCompanias);
        // Facility
        const divFacility = document.createElement("div");
        divFacility.style.position = "relative";
        this.facilityInput = document.createElement("input");
        this.facilityInput.type = "text";
        this.facilityInput.id = "facility";
        this.facilityInput.placeholder = "Ingrese planta";
        this.facilityInput.classList.add("input-box");
        const listaFacilities = document.createElement("ul");
        listaFacilities.id = "facilitiesList";
        this.estilizarLista(listaFacilities);
        divFacility.appendChild(this.facilityInput);
        divFacility.appendChild(listaFacilities);
        // Agregar al contenedor
        this.formContainer.innerHTML = "";
        this.formContainer.appendChild(divBuscarCompania);
        this.formContainer.appendChild(divFacility);
        this.addEventListeners();
    }
    estilizarLista(ul) {
        ul.style.position = "absolute";
        ul.style.top = "100%";
        ul.style.left = "0";
        ul.style.right = "0";
        ul.style.backgroundColor = "white";
        ul.style.border = "1px solid #ccc";
        ul.style.maxHeight = "150px";
        ul.style.overflowY = "auto";
        ul.style.zIndex = "1000";
        ul.style.listStyle = "none";
        ul.style.padding = "0";
        ul.style.margin = "0";
        ul.style.display = "none";
    }
    addEventListeners() {
        if (!this.buscarCompaniaInput || !this.facilityInput)
            return;
        this.buscarCompaniaInput.addEventListener("focus", () => {
            console.log("Focus en buscarCompaniaInput");
            this.mostrarCompanias();
        });
        this.buscarCompaniaInput.addEventListener("input", () => this.filtrarCompanias());
        this.buscarCompaniaInput.addEventListener("blur", () => setTimeout(() => this.ocultarLista("companiasList"), 150));
        this.facilityInput.addEventListener("focus", () => {
            console.log("Focus en facilityInput");
            this.mostrarFacilities();
        });
        this.facilityInput.addEventListener("input", () => this.filtrarFacilities());
        this.facilityInput.addEventListener("blur", () => setTimeout(() => this.ocultarLista("facilitiesList"), 150));
    }
    ocultarLista(listId) {
        const lista = document.getElementById(listId);
        if (lista) {
            lista.style.display = "none";
            console.log(`Lista ${listId} oculta`);
        }
    }
    async mostrarCompanias() {
        console.log("mostrarCompanias llamado");
        if (this.listaCompletaCompanias.length === 0) {
            console.log("Lista de compañías vacía, consultando...");
            await this.consultarCompanias();
        }
        this.renderListaCompanias(this.listaCompletaCompanias);
    }
    async consultarCompanias() {
        try {
            console.log("Consultando compañías desde GraphQL...");
            const response = await fetch("/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: GET_COMPANIES }),
            });
            const { data } = await response.json();
            console.log("Respuesta GraphQL compañías:", data);
            this.listaCompletaCompanias = data.companies || [];
        }
        catch (err) {
            console.error("Error consultarCompanias:", err);
            this.listaCompletaCompanias = [];
        }
    }
    filtrarCompanias() {
        if (!this.buscarCompaniaInput)
            return;
        const texto = this.buscarCompaniaInput.value.toLowerCase();
        console.log("Filtrando compañías con texto:", texto);
        const filtradas = this.listaCompletaCompanias.filter(c => c.CPYNAM_0.toLowerCase().includes(texto));
        this.renderListaCompanias(filtradas);
    }
    renderListaCompanias(companias) {
        console.log("Renderizando compañías:", companias);
        const lista = document.getElementById("companiasList");
        lista.innerHTML = "";
        companias.forEach(c => {
            const li = document.createElement("li");
            li.textContent = c.CPYNAM_0;
            li.dataset.cpyCode = c.CPY_0;
            li.style.cursor = "pointer";
            li.style.padding = "5px";
            li.addEventListener("click", () => {
                console.log("Compañía seleccionada:", c);
                if (this.buscarCompaniaInput)
                    this.buscarCompaniaInput.value = c.CPYNAM_0;
                this.buscarCompaniaInput.dataset.selectedCpy = c.CPY_0;
                lista.style.display = "none";
                this.cargarFacilities();
            });
            lista.appendChild(li);
        });
        lista.style.display = "block";
    }
    async mostrarFacilities() {
        console.log("mostrarFacilities llamado. listaCompletaFacilities:", this.listaCompletaFacilities);
        if (this.listaCompletaFacilities.length === 0) {
            console.log("listaCompletaFacilities vacía, llamando a cargarFacilities...");
            await this.cargarFacilities();
        }
        else {
            console.log("listaCompletaFacilities ya cargada, renderizando...");
            this.renderListaFacilities(this.listaCompletaFacilities);
        }
    }
    async cargarFacilities() {
        if (!this.buscarCompaniaInput) {
            console.log("buscarCompaniaInput es null");
            return;
        }
        const cpyCode = this.buscarCompaniaInput.dataset.selectedCpy;
        console.log("cargarFacilities con cpyCode:", cpyCode);
        if (!cpyCode) {
            console.log("No hay cpyCode seleccionado");
            return;
        }
        try {
            const response = await fetch("/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: queryFacilities, variables: { legcpy: cpyCode } }),
            });
            const { data } = await response.json();
            console.log("Respuesta de GraphQL (facilities):", data);
            this.listaCompletaFacilities = data.facilities || [];
            this.renderListaFacilities(this.listaCompletaFacilities);
        }
        catch (err) {
            console.error("Error cargarFacilities:", err);
            this.listaCompletaFacilities = [];
        }
    }
    filtrarFacilities() {
        if (!this.facilityInput)
            return;
        const texto = this.facilityInput.value.toLowerCase();
        console.log("Filtrando facilities con texto:", texto);
        const filtradas = this.listaCompletaFacilities.filter(f => f.FCYSHO_0.toLowerCase().includes(texto) || f.FCY_0.toLowerCase().includes(texto));
        this.renderListaFacilities(filtradas);
    }
    renderListaFacilities(facilities) {
        console.log("Renderizando facilities:", facilities);
        const lista = document.getElementById("facilitiesList");
        lista.innerHTML = "";
        facilities.forEach(f => {
            const li = document.createElement("li");
            li.textContent = `${f.FCYSHO_0} (${f.FCY_0})`;
            li.style.cursor = "pointer";
            li.style.padding = "5px";
            li.addEventListener("click", () => {
                console.log("Facility seleccionada:", f);
                if (this.facilityInput)
                    this.facilityInput.value = `${f.FCYSHO_0} (${f.FCY_0})`;
                this.facilityInput.dataset.facilityCode = f.FCY_0;
                lista.style.display = "none";
            });
            lista.appendChild(li);
        });
        lista.style.display = "block";
    }
    crearBotonGuardar() {
        const btnGuardar = document.createElement("button");
        btnGuardar.textContent = "Guardar Selección";
        btnGuardar.style.marginTop = "10px";
        btnGuardar.addEventListener("click", () => this.guardarSeleccion());
        this.formContainer.appendChild(btnGuardar);
    }
    guardarSeleccion() {
        const puesto = window.puestoSeleccionado;
        const company = this.buscarCompaniaInput?.dataset.selectedCpy || null;
        const facility = this.facilityInput?.dataset.facilityCode || null;
        console.log("Guardar selección: ", { puesto, company, facility });
        if (!puesto || !company || !facility) {
            alert("Debe seleccionar puesto, compañía y planta para guardar");
            return;
        }
        sessionStorage.setItem("seleccionUsuario", JSON.stringify({ puesto, company, facility }));
        alert("Datos guardados en sesión");
        if (this.onGuardarCallback) {
            console.log("Llamando callback onGuardarCallback");
            this.onGuardarCallback({ company, facility });
        }
    }
}
const settingsUser = new SettingsUser("formContainer");
