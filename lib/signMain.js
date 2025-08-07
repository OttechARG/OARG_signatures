"use strict";
const puestos = ["Planta"];
const input = document.getElementById('searchInput');
const suggestionsList = document.getElementById('suggestionsList');
const plantaFields = document.getElementById('plantaFields');
const buscarPlantaInput = document.getElementById('buscarPlanta');
const remitosAsociados = document.getElementById('remitosAsociados');
function mostrarSugerencias(value) {
    const mostrar = value === '' ? puestos : puestos.filter(p => p.toLowerCase().includes(value));
    suggestionsList.innerHTML = '';
    if (mostrar.length === 0) {
        suggestionsList.style.display = 'none';
        return;
    }
    mostrar.forEach(puesto => {
        const li = document.createElement('li');
        li.textContent = puesto;
        li.addEventListener('click', () => {
            input.value = puesto;
            suggestionsList.style.display = 'none';
            manejarSeleccion(puesto);
        });
        suggestionsList.appendChild(li);
    });
    suggestionsList.style.display = 'block';
}
function manejarSeleccion(valor) {
    if (valor.toLowerCase() === 'planta') {
        plantaFields.style.display = 'block';
    }
    else {
        plantaFields.style.display = 'none';
    }
}
input.addEventListener('input', () => {
    const value = input.value.trim().toLowerCase();
    mostrarSugerencias(value);
    manejarSeleccion(input.value.trim());
});
input.addEventListener('focus', () => {
    const value = input.value.trim().toLowerCase();
    mostrarSugerencias(value);
});
input.addEventListener('blur', () => {
    setTimeout(() => {
        suggestionsList.style.display = 'none';
    }, 100);
});
input.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
        const valor = input.value.trim();
        if (valor) {
            manejarSeleccion(valor);
            alert(`Buscaste: ${valor}`);
        }
    }
});
async function buscarPlanta(nombre) {
    const query = `
    query {
      x3System {
        site {
          query(
            filter: "{ \\"_and\\":[{\\"isStockSite\\":true},{\\"_or\\":[{\\"name\\":{\\"_regex\\":\\"${nombre}\\",\\"_options\\":\\"i\\"}},{\\"code\\":{\\"_regex\\":\\"${nombre}\\",\\"_options\\":\\"i\\"}}]}]}"
            orderBy: "{\\"code\\":1,\\"_id\\":1}"
            first: 10
          ) {
            edges {
              node {
                _id
                isStockSite
                name
                code
              }
            }
          }
        }
      }
    }
  `;
    try {
        const response = await fetch('http://localhost:3000/proxy/xtrem-api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        const result = await response.json();
        const sitios = result?.data?.x3System?.site?.query?.edges || [];
        if (sitios.length > 0) {
            const resumen = sitios.map((site) => `${site.node.name} (${site.node.code})`).join(', ');
            remitosAsociados.textContent = `Plantas encontradas: ${resumen}`;
        }
        else {
            remitosAsociados.textContent = 'No se encontraron plantas';
        }
    }
    catch (error) {
        console.error('Error al buscar plantas:', error);
        remitosAsociados.textContent = 'Error al buscar plantas';
    }
}
buscarPlantaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const valor = buscarPlantaInput.value.trim();
        if (valor) {
            buscarPlanta(valor);
        }
    }
});
