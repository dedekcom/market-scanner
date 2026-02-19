//import { getTickers } from './tickers.js';

// Kontenery
const container = document.getElementById("filters");
const resultsContainer = document.getElementById("results");
const indicatorSelect = document.getElementById("indicator-select");

const tickers = getTickers();

/** Funkcja pomocnicza: oblicza SMA */
function calcSMA(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / slice.length;
}

/** Funkcja pomocnicza: oblicza średnie liquidity z ostatnich `depth` sesji */
function calcLiquidity(entries, depth = 1) {
  const slice = entries.slice(-depth);
  if (slice.length === 0) return 0;

  const sumLiquidity = slice.reduce((acc, row) => {
    const [date, o, h, l, c, volume] = row;
    const avgPrice = (o + h + l + c) / 4;
    return acc + avgPrice * volume;
  }, 0);

  return sumLiquidity / slice.length;
}

// ------------------------------
// 1️⃣ Liquidity z ostatnich 20 sesji
const liquidity20Data = Object.entries(tickers).map(([ticker, rows]) => ({
  ticker,
  value: calcLiquidity(rows, 20)
}));

// 2️⃣ Relative Force (% od SMA125)
const relativeForceData = Object.entries(tickers).map(([ticker, rows]) => {
  const closes = rows.map(r => r[4]); // Close
  const sma125 = calcSMA(closes, 125);
  const lastClose = closes[closes.length - 1];
  const rf = sma125 ? ((lastClose - sma125) / sma125) * 100 : 0;
  return {
    ticker,
    value: rf
  };
});

// 3️⃣ Relative Force Rating (ranking procentowy)
const sortedRF = [...relativeForceData].sort((a, b) => b.value - a.value);
const relativeForceRating = sortedRF.map((d, index) => ({
  ticker: d.ticker,
  value: (index / (sortedRF.length - 1)) * 100
}));

// ------------------------------
// łączymy wszystkie trzy do simulatedData
// Każdy ticker ma obiekt z trzema wartościami
const simulatedData = Object.keys(tickers).map(ticker => {
  const liq = liquidity20Data.find(d => d.ticker === ticker)?.value ?? 0;
  const rf = relativeForceData.find(d => d.ticker === ticker)?.value ?? 0;
  const rfRating = relativeForceRating.find(d => d.ticker === ticker)?.value ?? 0;

  return {
    ticker,
    liquidity_20d: liq,
    relative_force: rf,
    relative_force_rating: rfRating
  };
});

// 2️⃣ Lista dostępnych indykatorów
const indicators = ["liquidity_20d", "relative_force", "relative_force_rating"];
let activeFilters = {}; // { rsi: HistogramFilter, ... }
let selectedTickers = {}; // koniunkcja tickers
let currentSort = { column: null, asc: true }; // globalnie w main.js


// 3️⃣ Przyciski wyboru filtrów
indicators.forEach(ind => {
  const btn = document.createElement("button");
  btn.textContent = ind.toUpperCase();
  btn.addEventListener("click", () => addFilter(ind));
  indicatorSelect.appendChild(btn);
});

// 4️⃣ Dodanie filtra
function addFilter(indicator) {
  if (activeFilters[indicator]) return;

  const data = simulatedData.map(d => ({
    ticker: d.ticker,
    value: d[indicator]
  }));

  const filter = new HistogramFilter({
    container,
    title: indicator.toUpperCase(),
    data,
    bins: 50,
    onChange: () => updateTickers()
  });

  // Obsługa przycisku X w histogramie
  const removeBtn = filter.root.querySelector(".remove-btn");
  removeBtn.addEventListener("click", () => {
    filter.remove();                // usuń z DOM
    delete activeFilters[indicator]; // usuń z aktywnych filtrów
    updateTickers();                 // reset tickers
  });

  activeFilters[indicator] = filter;
  updateTickers();
}

// 5️⃣ Aktualizacja tickers (koniunkcja)
function updateTickers() {
  const allFiltered = Object.values(activeFilters).map(f => f.lastFiltered || []);

  if (allFiltered.length === 0) {
    selectedTickers = new Set();
  } else {
    selectedTickers = allFiltered
      .map(arr => new Set(arr))
      .reduce((acc, s) => new Set([...acc].filter(t => s.has(t))));
  }

  renderResults();
}

// 6️⃣ Tabela wyników
function renderResults() {
  resultsContainer.innerHTML = "";

  if (!selectedTickers || selectedTickers.size === 0) return;

  const table = document.createElement("table");
  table.classList.add("results-table");

  // Nagłówek
  const header = document.createElement("tr");
  const columns = ["Ticker", ...Object.keys(activeFilters).map(ind => ind.toUpperCase())];
  columns.forEach((col, index) => {
    const th = document.createElement("th");
    th.textContent = col;
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      sortResults(index); // sortuj po tej kolumnie
    });
    header.appendChild(th);
  });
  table.appendChild(header);

  // Zbierz dane
  let rowsData = Array.from(selectedTickers).map(ticker => {
    const d = simulatedData.find(d => d.ticker === ticker);
    return [ticker, ...Object.keys(activeFilters).map(ind => d[ind])];
  });

  // Sortowanie jeśli jest ustawione
  if (currentSort.column !== null) {
    const colIndex = currentSort.column;
    rowsData.sort((a, b) => {
      let valA = a[colIndex];
      let valB = b[colIndex];
      if (typeof valA === "string") valA = valA.toUpperCase();
      if (typeof valB === "string") valB = valB.toUpperCase();
      if (valA < valB) return currentSort.asc ? -1 : 1;
      if (valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    });
  }

  // Render wierszy
  rowsData.forEach((rowData, index) => {
    const row = document.createElement("tr");
    if (index % 2 === 1) row.classList.add("even-row"); // co drugi wiersz szary
    row.innerHTML = rowData.map((cell, i) => {
      if (i === 0) return `<td>${cell}</td>`; // ticker wyrównanie lewe
      return `<td>${cell.toFixed(2)}</td>`;
    }).join("");
    table.appendChild(row);
  });

  resultsContainer.appendChild(table);
}

// Funkcja sortująca
function sortResults(colIndex) {
  if (currentSort.column === colIndex) {
    currentSort.asc = !currentSort.asc; // odwróć kierunek
  } else {
    currentSort.column = colIndex;
    currentSort.asc = true; // domyślnie rosnąco
  }
  renderResults();
}


// 7️⃣ Patch HistogramFilter: pamięta ostatnie tickery
HistogramFilter.prototype.emitChange = function() {
  if (!this.onChange) return;

  const filtered = this.data
    .filter(d => d.value >= this.selectedMin && d.value <= this.selectedMax)
    .map(d => d.ticker);

  this.lastFiltered = filtered;
  this.onChange(filtered);
};
