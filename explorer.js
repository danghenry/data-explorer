class FunWithDataExplorer {
  constructor(containerId, dataUrl) {
    this.container = document.getElementById(containerId);
    this.dataUrl = dataUrl;
    this.data = [];
    this.chart = null;
  }

  async init() {
    await this.loadData();
    this.renderLayout();
    this.populateControls();
    this.update();
  }

  async loadData() {
    const res = await fetch(this.dataUrl);
    this.data = await res.json();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="fwd-controls">
        <select id="topic-select"></select>
        <select id="indicator-select"></select>
        <select id="geo-select"></select>
        <select id="year-select"></select>
        <button id="download-btn">Download CSV</button>
      </div>

      <div class="fwd-tabs">
        <button id="chart-tab">Chart</button>
        <button id="table-tab">Table</button>
      </div>

      <canvas id="fwd-chart"></canvas>
      <div id="fwd-table-container" style="display:none;"></div>
    `;
  }

  populateControls() {
    this.populateDropdown("topic-select", [...new Set(this.data.map(d => d.topic))]);
    this.populateDropdown("geo-select", [...new Set(this.data.map(d => d.geography))]);
    this.populateDropdown("year-select", ["All", ...new Set(this.data.map(d => d.year))]);

    document.getElementById("topic-select").addEventListener("change", () => {
      this.updateIndicators();
      this.update();
    });

    document.getElementById("indicator-select").addEventListener("change", () => this.update());
    document.getElementById("geo-select").addEventListener("change", () => this.update());
    document.getElementById("year-select").addEventListener("change", () => this.update());

    document.getElementById("chart-tab").addEventListener("click", () => this.showChart());
    document.getElementById("table-tab").addEventListener("click", () => this.showTable());
    document.getElementById("download-btn").addEventListener("click", () => this.downloadCSV());

    this.updateIndicators();
  }

  populateDropdown(id, values) {
    const select = document.getElementById(id);
    select.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join("");
  }

  updateIndicators() {
    const topic = document.getElementById("topic-select").value;
    const indicators = [...new Set(
      this.data.filter(d => d.topic === topic).map(d => d.indicator)
    )];
    this.populateDropdown("indicator-select", indicators);
  }

  filterData() {
    const topic = document.getElementById("topic-select").value;
    const indicator = document.getElementById("indicator-select").value;
    const geo = document.getElementById("geo-select").value;
    const year = document.getElementById("year-select").value;

    return this.data.filter(d =>
      d.topic === topic &&
      d.indicator === indicator &&
      d.geography === geo &&
      (year === "All" || d.year == year)
    );
  }

  update() {
    const filtered = this.filterData();
    this.renderChart(filtered);
    this.renderTable(filtered);
  }

  renderChart(data) {
    const ctx = document.getElementById("fwd-chart");

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(d => d.year),
        datasets: [{
          label: data[0]?.indicator || "",
          data: data.map(d => d.value)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true }
        }
      }
    });
  }

  renderTable(data) {
    const container = document.getElementById("fwd-table-container");

    container.innerHTML = `
      <table id="fwd-table">
        <thead>
          <tr>
            <th>Year</th>
            <th>Value</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(d => `
            <tr>
              <td>${d.year}</td>
              <td>${d.value}</td>
              <td>${d.unit}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  showChart() {
    document.getElementById("fwd-chart").style.display = "block";
    document.getElementById("fwd-table-container").style.display = "none";
  }

  showTable() {
    document.getElementById("fwd-chart").style.display = "none";
    document.getElementById("fwd-table-container").style.display = "block";
  }

  downloadCSV() {
    const data = this.filterData();
    const csv = [
      ["Year","Value","Unit"],
      ...data.map(d => [d.year, d.value, d.unit])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data.csv";
    link.click();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const explorer = new FunWithDataExplorer(
    "fwd-data-explorer",
    "https://danghenry.github.io/data-explorer/sample_app_data.json"
  );
  explorer.init();

});
