import { Puestos } from "./HiddenValues.js";
const puestos = Puestos.lista;
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
suggestionsList.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.tagName === "LI") {
        input.value = target.textContent || "";
        suggestionsList.style.display = "none";
        suggestionsList.innerHTML = "";
        if (input.value === "Planta") {
            showFieldsAssociatedWithPlanta();
        }
        else {
            ocultarCampoBuscarCompania();
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
function consultarCompanias() {
    fetch(`/api/companias`)
        .then(res => res.json())
        .then((data) => {
        listaCompletaCompanias = data; // guardo lista completa en memoria
        mostrarCompaniasEnLista(data);
    })
        .catch(console.error);
}
function mostrarCompaniasEnLista(companias) {
    const listaCompanias = document.getElementById("companiasList");
    if (!listaCompanias)
        return;
    if (companias.length === 0) {
        listaCompanias.style.display = "none";
        listaCompanias.innerHTML = "";
        return;
    }
    listaCompanias.innerHTML = companias
        .map(c => `<li style="padding:8px;cursor:pointer;">${c.CPYNAM_0}</li>`)
        .join("");
    listaCompanias.style.display = "block";
}
function showFieldsAssociatedWithPlanta() {
    if (!buscarCompaniaInput) {
        // Container SOLO para buscarCompania + lista
        const divBuscarCompania = document.createElement("div");
        divBuscarCompania.style.position = "relative";
        const labelBuscarCompania = document.createElement("label");
        labelBuscarCompania.htmlFor = "buscarCompania";
        // labelBuscarCompania.textContent = ""; // opcional
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
        // Container SEPARADO para facility (sin lista)
        const divFacility = document.createElement("div");
        divFacility.style.position = "relative"; // no obligatorio aquí
        const labelFacility = document.createElement("label");
        labelFacility.htmlFor = "facility";
        // labelFacility.textContent = ""; // opcional
        facilityInput = document.createElement("input");
        facilityInput.type = "text";
        facilityInput.id = "facility";
        facilityInput.name = "facility";
        facilityInput.placeholder = "Ingrese facility";
        facilityInput.classList.add("input-box");
        divFacility.appendChild(labelFacility);
        divFacility.appendChild(facilityInput);
        // Limpio contenedor principal si acaso y agrego ambos divs
        formContainer.appendChild(divBuscarCompania);
        formContainer.appendChild(divFacility);
        // Eventos para buscarCompaniaInput y lista como antes
        if (buscarCompaniaInput) {
            buscarCompaniaInput.addEventListener("focus", () => {
                if (listaCompletaCompanias.length === 0) {
                    consultarCompanias();
                }
                else {
                    mostrarCompaniasEnLista(listaCompletaCompanias);
                }
            });
            buscarCompaniaInput.addEventListener("input", () => {
                if (!buscarCompaniaInput)
                    return;
                const texto = buscarCompaniaInput.value.toLowerCase();
                const filtradas = listaCompletaCompanias.filter(c => c.CPYNAM_0.toLowerCase().includes(texto));
                mostrarCompaniasEnLista(filtradas);
            });
            buscarCompaniaInput.addEventListener("blur", () => {
                setTimeout(() => {
                    const listaCompanias = document.getElementById("companiasList");
                    if (listaCompanias)
                        listaCompanias.style.display = "none";
                }, 150);
            });
        }
        if (listaCompanias) {
            listaCompanias.addEventListener("click", (event) => {
                const target = event.target;
                if (target && target.tagName === "LI" && buscarCompaniaInput) {
                    buscarCompaniaInput.value = target.textContent || "";
                    listaCompanias.style.display = "none";
                }
            });
        }
    }
    else {
        // Si ya existían inputs, mostramos el contenedor principal (o cada div si quieres)
        // Por simplicidad, acá no hago nada, podés implementar según necesites
    }
}
