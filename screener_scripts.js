// sortowanie tabeli po danej kolumnie
function sortTable(tableId, colIndex, ascending = true) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aVal = parseFloat(a.children[colIndex].textContent.replace(',', '.')) || 0;
        const bVal = parseFloat(b.children[colIndex].textContent.replace(',', '.')) || 0;
        return ascending ? aVal - bVal : bVal - aVal;
    });

    // od razu przepinamy wszystkie wiersze
    rows.forEach(r => tbody.appendChild(r));
}

// funkcja dodająca obsługę sortowania dla wszystkich kolumn w tabeli
function attachSorting(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const ths = table.tHead.rows[0].cells; // pierwsza linia nagłówka
    for (let i = 1; i < ths.length; i++) { // 0 = Ticker
        ths[i].style.cursor = 'pointer';
        ths[i].dataset.ascending = true;
        ths[i].addEventListener('click', () => {
            const ascending = ths[i].dataset.ascending === 'true';
            sortTable(tableId, i, ascending);
            ths[i].dataset.ascending = ascending ? 'false' : 'true';
        });
    }
}
