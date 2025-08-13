export class TableHandler {
  private tableId: string;

  constructor(tableId: string) {
    this.tableId = tableId;
  }

  public setupColumnFilters(): void {
    const table = document.getElementById(this.tableId) as HTMLTableElement;
    if (!table) return;

    const filterInputs = table.querySelectorAll<HTMLInputElement>('thead input.filter-input');

    // Listener para cada input
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
}