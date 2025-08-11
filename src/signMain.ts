
import { GET_COMPANIES, queryFacilities, queryRemitos } from "./graphql/queries.js";
import { Puestos } from "./HiddenValues.js";

const puestos = Puestos.lista;

const input = document.getElementById("searchInput") as HTMLInputElement;
const suggestionsList = document.getElementById("suggestionsList") as HTMLUListElement;
const formContainer = document.getElementById("formContainer") as HTMLDivElement;

let buscarCompaniaInput: HTMLInputElement | null = null;
let facilityInput: HTMLInputElement | null = null;
let remitosInput: HTMLInputElement | null = null;   // NUEVO: input para remitos

input.addEventListener("input", () => {
  const query = input.value.toLowerCase();

  if (!query) {
    suggestionsList.style.display = "none";
    suggestionsList.innerHTML = "";
    return;
  }

  const filtered = puestos.filter(puesto =>
    puesto.toLowerCase().includes(query)
  );

  if (filtered.length > 0) {
    suggestionsList.innerHTML = filtered
      .map(puesto => `<li class="suggestion-item">${puesto}</li>`)
      .join("");
    suggestionsList.style.display = "block";
  } else {
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
  const target = event.target as HTMLElement;
  if (target && target.tagName === "LI") {
    input.value = target.textContent || "";
    suggestionsList.style.display = "none";
    suggestionsList.innerHTML = "";

    if (input.value === "Planta") {
      showFieldsAssociatedWithPlanta();
    } else {
      ocultarCampoBuscarCompania();
    }

    const recuperarBtn = document.getElementById("recuperarDocumentoBtn") as HTMLButtonElement;
    if (recuperarBtn) {
      recuperarBtn.style.display = "inline-block"; // mostrar botón

      // Agregar listener solo una vez para evitar múltiples suscripciones
      if (!recuperarBtn.hasAttribute("data-listener-added")) {

        async function fetchWithTimeout(url: string, timeout = 9000) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                if (!response.ok) throw new Error(`Error en la respuesta: ${response.statusText}`);
                const blob = await response.blob();
                return blob;
            } catch (error) {
                clearTimeout(id);
                throw error;
                }
            }

        /*async function recuperarDocumentoConReintentos(url: string, maxIntentos = 3) {
            for (let i = 0; i < maxIntentos; i++) {
                    try {
                        console.log(`Intento ${i + 1} con ${url}`);
                        const blob = await fetchWithTimeout(url, 9000); // ahora es Blob
                        console.log("Respuesta recibida en intento", i + 1);

                        // Leer los primeros bytes para detectar PDF
                        const headerArrayBuffer = await blob.slice(0, 5).arrayBuffer();
                        const header = new TextDecoder("utf-8").decode(headerArrayBuffer);

                        if (header === '%PDF-') {
                            mostrarPdfConOpciones(blob);  // correcto: pasamos Blob
                        } else {
                            alert("Documento recuperado correctamente (no es PDF).");
                        }
                        return blob;
                    } catch (error) {
                        if ((error as Error).name === 'AbortError') {
                            console.warn(`Timeout en intento ${i + 1}`);
                        } else {
                            console.warn(`Error en intento ${i + 1}:`, (error as Error).message);
                        }
                    }
                }
                throw new Error(`No se pudo recuperar el documento tras ${maxIntentos} intentos.`);
                }  
*/
            async function recuperarDocumentoBase64ConReintentos(
            url: string, 
            maxIntentos = 3
            ) {
            for (let i = 0; i < maxIntentos; i++) {
                try {
                console.log(`Intento ${i + 1} con ${url}`);
                
                // Obtener Blob (binario)
                const blob = await fetchWithTimeout(url, 9000);

                // Leer los primeros bytes para detectar PDF
                const headerArrayBuffer = await blob.slice(0, 5).arrayBuffer();
                const header = new TextDecoder("utf-8").decode(headerArrayBuffer);

                // Convertir Blob a Base64
                const base64 = await blobToBase64(blob);

                if (header === '%PDF-') {
                    console.log("Es PDF, procesando...");
                } else {
                    alert("Documento recuperado correctamente (no es PDF).");
                }

                // Llamada al resolver ficticio para guardar base64
                const urlHTMLFirmarPDF = await llamarMutationSubirPdfBase64(base64);
                console.log("PDF recibido (URL):", urlHTMLFirmarPDF);
                window.location.href = urlHTMLFirmarPDF;
                // Hacemos fetch para obtener el contenido HTML desde la URL recibida
                
                return base64;

                } catch (error) {
                if ((error as Error).name === 'AbortError') {
                    console.warn(`Timeout en intento ${i + 1}`);
                } else {
                    console.warn(`Error en intento ${i + 1}:`, (error as Error).message);
                }
                }
            }
            throw new Error(`No se pudo recuperar el documento tras ${maxIntentos} intentos.`);
            }

            // Función auxiliar para convertir Blob a Base64
            function blobToBase64(blob: Blob): Promise<string> {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                const base64data = reader.result as string;
                // reader.result viene como data:<tipo>;base64,<base64>, queremos solo la parte Base64
                const base64 = base64data.split(',')[1];
                resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            }

            // Resolver ficticio (ejemplo)
            // Esto estaría en RemitoResolvers.ts
            class RemitoResolvers {
            static async firmarDocumentoBase64(base64: string, url: string) {
                // Aquí harías lógica para guardar el base64 en DB, enviarlo, etc.
                console.log(`Procesando para firmar documento base64 de ${url}, tamaño: ${base64.length} caracteres`);
                // Simulamos async
                return new Promise(resolve => setTimeout(resolve, 200));
            }
            }
        recuperarBtn.addEventListener("click", async () => {
          if (!remitosInput || !remitosInput.value) {
            alert("Por favor seleccione un remito antes de recuperar el documento.");
            return;
          }
          const pcle = remitosInput.value.trim();
          const url = `/proxy-getrpt?PCLE=${encodeURIComponent(pcle)}`;

          try {
            await recuperarDocumentoBase64ConReintentos(url);
          } catch (error) {
            console.error(error);
            alert((error as Error).message);
          }
        });

        recuperarBtn.setAttribute("data-listener-added", "true");
      }
    }
  }
});
// Función para convertir texto a Uint8Array (para el PDF)
function textToUint8Array(text: string) {
  const buf = new ArrayBuffer(text.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0; i < text.length; i++) {
    bufView[i] = text.charCodeAt(i);
  }
  return bufView;
}
async function llamarMutationSubirPdfBase64(base64: string) {
      console.log("Inicio de llamada a subirPdfBase64");
  console.log("Tamaño del base64 recibido:", base64.length);
  const query = `
    mutation SubirPdfBase64($pdfBase64: String!) {
      subirPdfBase64(pdfBase64: $pdfBase64) {
        url
      }
    }
  `;
 console.log("Preparando fetch a /graphql");
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { pdfBase64: base64 }
    }),
    
  });
  console.log("Fetch completado. Status:", response.status);

  const { data, errors } = await response.json();
  
  if (errors) {
    
      console.error("Errores en la respuesta GraphQL:", errors);
      throw new Error(errors.map((e:any) => e.message).join(', '));
}
console.log("URL recibida:", data.subirPdfBase64.url);
  return data.subirPdfBase64.url;
}
// Función para mostrar el PDF con botones Aceptar y Cancelar
function mostrarPdfConOpciones(blob: Blob) {
  const pdfUrl = URL.createObjectURL(blob);

  let modal = document.getElementById('pdfModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pdfModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '10000';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:#fff; padding:20px; max-width: 90vw; max-height: 90vh; display: flex; flex-direction: column; align-items: center;">
<embed src="${pdfUrl}" type="application/pdf" width="600" height="800" />      <div style="margin-top:10px; text-align:center;">
        <button id="btnAceptar" style="margin-right:20px; padding:10px 20px;">Aceptar</button>
        <button id="btnCancelar" style="padding:10px 20px;">Cancelar</button>
      </div>
    </div>
  `;

  const btnAceptar = document.getElementById('btnAceptar');
  const btnCancelar = document.getElementById('btnCancelar');

  btnAceptar?.addEventListener('click', () => {
    alert('Remito aceptado');
    modal!.style.display = 'none';
    URL.revokeObjectURL(pdfUrl);
  });

  btnCancelar?.addEventListener('click', () => {
    modal!.style.display = 'none';
    URL.revokeObjectURL(pdfUrl);
  });

  modal.style.display = 'flex';
}
async function fetchPdf(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);

  const blob = await response.blob();

  // Opcional: verifica que sea PDF
  if (blob.type !== 'application/pdf') {
    alert('El archivo recibido no es un PDF.');
    return;
  }

  mostrarPdfConOpciones(blob);
}
function ocultarCampoBuscarCompania() {
  const cont = document.getElementById("buscarCompaniaContainer");
  if (cont) {
    cont.style.display = "none";
  }
}

let listaCompletaCompanias: { CPY_0: string; CPYNAM_0: string }[] = [];
let listaCompletaFacilities: { FCY_0: string; FCYSHO_0: string }[] = [];
let listaCompletaRemitos: { CPY_0: string; STOFCY_0: string; SDHNUM_0: string; BPCORD_0: string; BPDNAM_0: string }[] = [];  // NUEVO

function showFieldsAssociatedWithPlanta() {
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
    facilityInput.placeholder = "Ingrese facility";
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

    // --- NUEVO: Contenedor para Remitos asociados ---
    const divRemitos = document.createElement("div");
    divRemitos.style.position = "relative";

    const labelRemitos = document.createElement("label");
    labelRemitos.htmlFor = "remitosAsociados";
    labelRemitos.textContent = "Remitos asociados:";

    remitosInput = document.createElement("input");
    remitosInput.type = "text";
    remitosInput.id = "remitosAsociados";
    remitosInput.name = "remitosAsociados";
    remitosInput.placeholder = "Remitos asociados";
    remitosInput.classList.add("input-box");
    remitosInput.readOnly = true; // solo lectura porque es resultado de fetch

    const listaRemitos = document.createElement("ul");
    listaRemitos.id = "remitosList";
    listaRemitos.style.position = "absolute";
    listaRemitos.style.top = "100%";
    listaRemitos.style.left = "0";
    listaRemitos.style.right = "0";
    listaRemitos.style.backgroundColor = "white";
    listaRemitos.style.border = "1px solid #ccc";
    listaRemitos.style.maxHeight = "150px";
    listaRemitos.style.overflowY = "auto";
    listaRemitos.style.zIndex = "1000";
    listaRemitos.style.listStyle = "none";
    listaRemitos.style.padding = "0";
    listaRemitos.style.margin = "0";
    listaRemitos.style.display = "none";

    divRemitos.appendChild(labelRemitos);
    divRemitos.appendChild(remitosInput);
    divRemitos.appendChild(listaRemitos);
    // --- FIN NUEVO ---

    // Agrego los tres divs al contenedor principal
    if (formContainer) {
      formContainer.innerHTML = ""; // limpio si había algo
      formContainer.appendChild(divBuscarCompania);
      formContainer.appendChild(divFacility);
      formContainer.appendChild(divRemitos); // agregado remitos
    }

    
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

      listaCompanias.style.display = "none";

      cargarFacilities();

      listaRemitos.innerHTML = "";
      listaRemitos.style.display = "none";
      remitosInput!.value = "";
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
          listaFacilities.style.display = "none";

          // Cuando selecciona facility, cargo remitos asociados
          cargarRemitos(buscarCompaniaInput!.value, facilityInput!.dataset.facilityCode!);
        });
        listaFacilities.appendChild(li);
      }
      listaFacilities.style.display = "block";
    }

    // Función para mostrar lista de remitos
    function mostrarRemitosEnLista(remitos: { CPY_0: string; STOFCY_0: string; SDHNUM_0: string; BPCORD_0: string; BPDNAM_0: string }[]) {
      console.log("Mostrar remitos:", remitos);
      listaRemitos.innerHTML = "";
      if (remitos.length === 0) {
        listaRemitos.style.display = "none";
        remitosInput!.value = "";
        return;
      }
      for (const r of remitos) {
        const li = document.createElement("li");
        li.textContent = `N°: ${r.SDHNUM_0} - Cliente: ${r.BPDNAM_0}`;
        li.style.padding = "5px";
        li.style.cursor = "default";
        li.addEventListener("click", () => {
          // Al hacer click, ponemos el remito seleccionado en el input (opcional)
          remitosInput!.value = r.SDHNUM_0;
          listaRemitos.style.display = "none";
        });
        listaRemitos.appendChild(li);
      }
      listaRemitos.style.display = "block";
    }

    // Función para consultar todas las compañías (sin filtro)
    
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
            async function cargarRemitos(cpyNombre: string, facilityCodigo: string) {
                try {
                    const cpyObj = listaCompletaCompanias.find(c => c.CPYNAM_0 === cpyNombre);
                    const facilityObj = listaCompletaFacilities.find(f => f.FCY_0 === facilityCodigo);
                    if (!cpyObj || !facilityObj) {
                    console.warn("No se encontró compañía o facility válido para remitos");
                    listaRemitos.innerHTML = "";
                    listaRemitos.style.display = "none";
                    remitosInput!.value = "";
                    return;
                    }

                    const response = await fetch('/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: queryRemitos,
                        variables: { cpy: cpyObj.CPY_0, stofcy: facilityObj.FCY_0 }
                    }),
                    });

                    const { data, errors } = await response.json();
                    if (errors) {
                    console.error('GraphQL errors:', errors);
                    listaCompletaRemitos = [];
                    // NO mostrar la lista aquí
                    return;
                    }

                    listaCompletaRemitos = data.remitos || [];
                    // NO llamar mostrarRemitosEnLista acá para que no se muestre automático

                } catch (err) {
                    console.error("Error cargarRemitos:", err);
                    listaRemitos.innerHTML = "";
                    listaRemitos.style.display = "none";
                    remitosInput!.value = "";
                }
                }
    // --- FIN NUEVO ---

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

    // Evento para remitosInput blur
    remitosInput.addEventListener("blur", () => {
      console.log("remitosInput blur");
      setTimeout(() => {
        const listaRemitos = document.getElementById("remitosList");
        if (listaRemitos) {
          listaRemitos.style.display = "none";
        }
      }, 150);
    });
    remitosInput!.addEventListener("focus", () => {
        if (listaCompletaRemitos.length > 0) {
            mostrarRemitosEnLista(listaCompletaRemitos);
        }
        });

        // Evento para remitosInput blur: ocultar lista con delay para poder clickear
        remitosInput.addEventListener("blur", () => {
        console.log("remitosInput blur");
        setTimeout(() => {
            const listaRemitos = document.getElementById("remitosList");
            if (listaRemitos) {
            listaRemitos.style.display = "none";
            }
        }, 150);
        });

  } else {
    // Si ya existe el input, podrías resetear o simplemente mostrar (depende tu lógica)
    console.log("Inputs ya creados, no se crean nuevamente");
  }
}