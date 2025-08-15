import { createButton } from "./ButtonsHandler.js";
import { recuperarDocumentoBase64ConReintentos } from "./PDFHandler.js";

export class TableHandler {
  private tableId: string;
  public remitoSeleccionado: { company: string; facility: string; remito: string } | null = null;

  constructor(tableId: string) {
    this.tableId = tableId;
  }

  public setupColumnFilters(): void {
    const table = document.getElementById(this.tableId) as HTMLTableElement;
    if (!table) return;

    const filterInputs = table.querySelectorAll<HTMLInputElement>('thead input.filter-input');

    filterInputs.forEach(input => {
      input.addEventListener('input', () => {
        const filters = Array.from(filterInputs).map(i => ({
          colIndex: Number(i.dataset.col),
          value: i.value.toLowerCase().trim()
        }));

        const tbody = table.tBodies[0];
        if (!tbody) return;

        Array.from(tbody.rows).forEach(row => {
          let visible = true;
          for (const filter of filters) {
            if (filter.value) {
              const cellText = row.cells[filter.colIndex]?.textContent?.toLowerCase() || '';
              if (!cellText.includes(filter.value)) {
                visible = false;
                break;
              }
            }
          }
          row.style.display = visible ? '' : 'none';
        });
      });
    });
  }

  public async renderTable(remitos: any[]): Promise<void> {
    const tabla = document.getElementById(this.tableId) as HTMLTableElement;
    const tbody = tabla.querySelector('tbody')!;
    tbody.innerHTML = "";

    // --- Obtener PDFs firmados desde GraphQL ---
    const signedKeys: string[] = await fetch("/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ signedPdfs }` }),
    })
  .then(res => res.json())
  .then(res => res.data?.signedPdfs || []); // si es null o undefined, devuelve array vacío

    for (const r of remitos) {
      const tr = document.createElement('tr');
      tr.dataset.company = r.CPY_0 || r.CPY || "";
      tr.dataset.facility = r.STOFCY_0 || r.STOFAC || "";
      tr.dataset.remito = String(r.SDHNUM_0 || "");
      tr.style.cursor = "pointer";

      const key = `${r.CPY_0 || r.CPY || ""}-${r.STOFCY_0 || r.STOFAC || ""}-${r.SDHNUM_0 || ""}`;
      const isSigned = signedKeys.includes(key);

      tr.innerHTML = `
        <td>${r.SDHNUM_0 || ""}</td>
        <td>${r.DLVDAT_0 || ""}</td>
        <td>${r.BPCORD_0 || ""}</td>
        <td>${r.BPDNAM_0 || ""}</td>
        <td class="${isSigned ? 'signed-true' : 'signed-false'}">
            ${isSigned ? '✓' : '✗'}
        </td>
        <td class="recover-doc-cell"></td>
      `;
      tbody.appendChild(tr);

      const tdBoton = tr.querySelector(".recover-doc-cell") as HTMLElement;
      if (!isSigned) {
        createButton(tdBoton, {
          id: `recuperarDocumentoBtn-${r.SDHNUM_0}`,
          text: "Firmar",
          onClick: async () => {
            // Guardar datos del remito en sessionStorage para uso posterior
            const remitoData = {
              cpy: r.CPY_0 || "",
              stofcy: r.STOFCY_0 || r.STOFAC || "",
              sdhnum: r.SDHNUM_0 || "",
              dlvdat: r.DLVDAT_0 || "",
              bpcord: r.BPCORD_0 || "",
              bpdnam: r.BPDNAM_0 || ""
            };
            sessionStorage.setItem('currentRemito', JSON.stringify(remitoData));
            console.log("Datos del remito guardados:", remitoData);

            const url = `/proxy-getrpt?PCLE=${encodeURIComponent(r.SDHNUM_0)}`;
            try {
              await recuperarDocumentoBase64ConReintentos(url);

              // --- Marcar como firmado en GraphQL ---
              await fetch("/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: `mutation($key: String!) { signPdf(key: $key) }`,
                  variables: { key }
                }),
              });

              // Actualizar visualmente
              tr.querySelector("td.signed-true, td.signed-false")!.textContent = "✓";
              tr.querySelector("td.signed-true, td.signed-false")!.className = "signed-true";

            } catch (error) {
              console.error(error);
              alert((error as Error).message);
            }
          },
          style: { padding: "4px 8px" }
        });
      }
    }

    this.setupColumnFilters();
    this.setupRowSelection();
  }

  private setupRowSelection(): void {
    const table = document.getElementById(this.tableId) as HTMLTableElement;
    if (!table) return;

    const tbody = table.tBodies[0];
    if (!tbody) return;

    Array.from(tbody.rows).forEach(row => {
      row.addEventListener("click", () => {
        tbody.querySelectorAll("tr.selected").forEach(r => r.classList.remove("selected"));
        row.classList.add("selected");

        const company = row.dataset.company;
        const facility = row.dataset.facility;
        const remito = row.dataset.remito;

        if (company && facility && remito) {
          this.remitoSeleccionado = { company, facility, remito };
          console.log("Remito seleccionado:", this.remitoSeleccionado);
        }
      });
    });
  }
}
