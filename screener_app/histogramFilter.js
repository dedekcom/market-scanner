class HistogramFilter {

  constructor({ container, title, data, bins = 100, onChange = null }) {
    this.container = container;
    this.title = title;
    this.data = data;
    this.bins = bins;
    this.onChange = onChange;

    this.values = data.map(d => d.value);
    this.globalMin = Math.min(...this.values);
    this.globalMax = Math.max(...this.values);

    this.selectedMin = this.globalMin;
    this.selectedMax = this.globalMax;

    this.buildUI();
    this.drawHistogram();
    this.initDragging();
    this.emitChange();
  }

  buildUI() {
    this.root = document.createElement("div");
    this.root.className = "histogram-filter";

    this.root.innerHTML = `
      <div class="filter-header">
        <span>${this.title}</span>
        <span class="remove-btn">✕</span>
      </div>
      <div class="filter-row">
        <input type="number" class="min-input">
        <div class="histogram-wrapper">
          <canvas width="200" height="60"></canvas>
          <div class="range-overlay"></div>
          <div class="handle handle-min">||</div>
          <div class="handle handle-max">||</div>
        </div>
        <input type="number" class="max-input">
      </div>
    `;

    this.container.appendChild(this.root);

    this.canvas = this.root.querySelector("canvas");
    this.overlay = this.root.querySelector(".range-overlay");
    this.handleMin = this.root.querySelector(".handle-min");
    this.handleMax = this.root.querySelector(".handle-max");
    this.minInput = this.root.querySelector(".min-input");
    this.maxInput = this.root.querySelector(".max-input");

    this.minInput.value = this.selectedMin.toFixed(2);
    this.maxInput.value = this.selectedMax.toFixed(2);

    this.minInput.addEventListener("input", () => this.inputChanged(false));
    this.maxInput.addEventListener("input", () => this.inputChanged(false));

    //this.minInput.addEventListener("blur", () => this.inputChanged(true));
    //this.maxInput.addEventListener("blur", () => this.inputChanged(true));

    this.minInput.addEventListener("keydown", e => {
      if (e.key === "Enter") this.minInput.blur();
    });
    this.maxInput.addEventListener("keydown", e => {
      if (e.key === "Enter") this.maxInput.blur();
    });

    this.root.querySelector(".remove-btn")
      .addEventListener("click", () => this.remove());
  }

  drawHistogram() {

    const range = this.globalMax - this.globalMin || 1;
    const binSize = range / this.bins;

    let counts = new Array(this.bins).fill(0);

    this.values.forEach(v => {
      let i = Math.floor((v - this.globalMin) / binSize);
      if (i >= this.bins) i = this.bins - 1;
      if (i < 0) i = 0;
      counts[i]++;
    });

    let colors = counts.map((_, i) => {
      let binMin = this.globalMin + i * binSize;
      let binMax = binMin + binSize;
      return (binMax >= this.selectedMin && binMin <= this.selectedMax)
        ? "#222"
        : "#ccc";
    });

    if (this.chart) this.chart.destroy();

    this.chart = new Chart(this.canvas, {
      type: "bar",
      data: {
        labels: counts.map(() => ""),
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: false,
        animation: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } }
      }
    });

    this.updateOverlay();
  }

  updateOverlay() {
    const width = this.canvas.width;
    const range = this.globalMax - this.globalMin || 1;

    const left = ((this.selectedMin - this.globalMin) / range) * width;
    const right = ((this.selectedMax - this.globalMin) / range) * width;

    this.overlay.style.left = left + "px";
    this.overlay.style.width = (right - left) + "px";

    this.handleMin.style.left = (left - 5) + "px";
    this.handleMax.style.left = (right - 5) + "px";
  }

  snap(value) {
    const range = this.globalMax - this.globalMin;
    if (range === 0) return this.globalMin;

    const binSize = range / this.bins;
    const snapped =
      Math.round((value - this.globalMin) / binSize) * binSize + this.globalMin;

    return Math.min(this.globalMax, Math.max(this.globalMin, snapped));
  }

inputChanged() {

  const minRaw = this.minInput.value;
  const maxRaw = this.maxInput.value;

  if (minRaw !== "") {
    const min = parseFloat(minRaw);
    if (!isNaN(min)) this.selectedMin = min;
  }

  if (maxRaw !== "") {
    const max = parseFloat(maxRaw);
    if (!isNaN(max)) this.selectedMax = max;
  }

  this.selectedMin = Math.max(this.globalMin, this.selectedMin);
  this.selectedMax = Math.min(this.globalMax, this.selectedMax);

  if (this.selectedMin > this.selectedMax) {
    [this.selectedMin, this.selectedMax] =
      [this.selectedMax, this.selectedMin];
  }

  this.drawHistogram();
  this.updateOverlay();
  this.emitChange();
}


  emitChange() {
    if (!this.onChange) return;

    const filtered = this.data
      .filter(d => d.value >= this.selectedMin && d.value <= this.selectedMax)
      .reduce((acc, d) => {
        acc[d.ticker] = true;
        return acc;
      }, {});

    this.onChange(filtered);
  }

  initDragging() {
    let dragging = null;
    const wrapper = this.root.querySelector(".histogram-wrapper");

    const move = (e) => {
      if (!dragging) return;

      const rect = wrapper.getBoundingClientRect();
      const width = this.canvas.width;
      const range = this.globalMax - this.globalMin || 1;

      let px = e.clientX - rect.left;
      px = Math.max(0, Math.min(px, width));

      let value = this.globalMin + (px / width) * range;

      if (dragging === "min") {
        this.selectedMin = Math.min(
          Math.max(value, this.globalMin),
          this.selectedMax
        );
      }

      if (dragging === "max") {
        this.selectedMax = Math.max(
          Math.min(value, this.globalMax),
          this.selectedMin
        );
      }

      this.minInput.value = this.selectedMin.toFixed(2);
      this.maxInput.value = this.selectedMax.toFixed(2);

      this.drawHistogram();
      this.updateOverlay();
      this.emitChange();
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", () => dragging = null);

    this.handleMin.onmousedown = () => dragging = "min";
    this.handleMax.onmousedown = () => dragging = "max";
  }

  remove() {
    if (this.chart) this.chart.destroy();
    this.root.remove();
  }
}
