export class TableHandler {
    constructor(tableId) {
        this.tableId = tableId;
    }
    setupColumnFilters() {
        const table = document.getElementById(this.tableId);
        if (!table)
            return;
        const filterInputs = table.querySelectorAll('thead input.filter-input');
        // Listener para cada input
        filterInputs.forEach(input => {
            input.addEventListener('input', () => {
                const filters = Array.from(filterInputs).map(i => ({
                    colIndex: Number(i.dataset.col),
                    value: i.value.toLowerCase().trim()
                }));
                const tbody = table.tBodies[0];
                if (!tbody)
                    return;
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
