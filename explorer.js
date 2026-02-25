// Dynamically load the CSS for the explorer
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://YOURUSERNAME.github.io/fwd-data-explorer/explorer.css";
document.head.appendChild(link);

class FunWithDataExplorer {
  constructor(containerId, dataUrl) {
    this.container = document.getElementById(containerId);
    this.dataUrl = dataUrl;
    this.data = [];
    this.chart = null;
    this.hasSubtopic = false; // auto-detect
  }

  async init() {
    await this.loadData();

    // Detect if CSV contains 'subtopic' column
    this.hasSubtopic = this.data.length > 0 && Object.keys(this.data[0]).includes("subtopic");

    this.renderLayout();
    this.populateControls();
    this.update();
  }

  async loadData() {
    return new Promise((resolve, reject) => {
      Papa.parse(this.dataUrl, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Keep only rows with mandatory columns
          this.data = results.data.filter(row => row.topic && row.indicator_id);
          console.log("CSV loaded. Rows:", this.data.length);
          resolve();
        },
        error: (err) => {
          console.error("CSV Load Error:", err);
          reject(err);
        }
      });
    });
  }

  renderLayout() {
    let subtopicHTML = "";
    if (this.hasSubtopic) {
      subtopicHTML = `<select id="subtopic-select"></select>`;
    }

    this.container.innerHTML = `
      <div class="fwd-controls">
        <select id="topic-select"></select>
        ${subtopicHTML}
        <select id="indicator-select"></select>
        <select id="geo-select"></select>
        <select id="year-select"></select>
        <select id="frequency-select"></select>
        <button id="download-btn">Download CSV</button>
      </div>

      <div class="fwd-tabs">
        <button id="chart-tab">Chart</button>
        <button id="table-tab">Table</button>
        <button id="metadata-tab">Metadata</button>
      </div>

      <canvas id="fwd-chart"></canvas>
      <div id="fwd-table-container" style="display:none;"></div>
      <div id="fwd-metadata-container" style="display:none; border:1px solid #ddd; padding:10px; margin-top:20px;"></div>
    `;
  }

  populateControls() {
    // Populate Topics
    const topics = [...new Set(this.data.map(d => d.topic))];
    this.populateDropdown("topic-select", topics);

    // Populate Geographies
    const geos = [...new Set(this.data.map(d => d.geography))];
    this.populateDropdown("geo-select", geos);

    // Populate Years
    const years = ["All", ...new Set(this.data.map(d => d.year))];
    this.populateDropdown("year-select", years);

    // Populate Frequencies
    const frequencies = [...new Set(this.data.map(d => d.frequency))];
    this.populateDropdown("frequency-select", frequencies);

    // Event Listeners
    document.getElementById("topic-select").addEventListener("change", () => {
      if (this.hasSubtopic) this.updateSubtopics();
      this.updateIndicators();
      this.update();
    });

    if (this.hasSubtopic) {
      document.getElementById("subtopic-select").addEventListener("change", () => this.updateIndicators());
    }

    document.getElementById("indicator-select").addEventListener("change", () => this.update());
    document.getElementById("geo-select").addEventListener("change", () => this.update());
    document.getElementById("year-select").addEventListener("change", () => this.update());
    document.getElementById("frequency-select").addEventListener("change", () => this.update());

    document.getElementById("chart-tab").addEventListener("click", () => this.showChart());
    document.getElementById("table-tab").addEventListener("click", () => this.showTable());
    document.getElementById("metadata-tab").addEventListener("click", () => this.showMetadata());
    document.getElementById("download-btn").addEventListener("click", () => this.downloadCSV());

    if (this.hasSubtopic) this.updateSubtopics();
    this.updateIndicators();
  }

  populateDropdown(id, values) {
    const select = document.getElementById(id);
    select.innerHTML = values.map(v => `<option value="${v}">${v}</option>`).join("");
  }

  updateSubtopics() {
    if (!this.hasSubtopic) return;
    const topic = document.getElementById("topic-select").value;
    const subtopics = [...new Set(this.data.filter(d => d.topic === topic && d.subtopic).map(d => d.subtopic))];
    this.populateDropdown("subtopic-select", subtopics);
  }

  updateIndicators() {
    const topic = document.getElementById("topic-select").value;
    const subtopic = this.hasSubtopic ? document.getElementById("subtopic-select").value : null;

    let filtered = this.data.filter(d => d.topic === topic);
    if (this.hasSubtopic && subtopic) filtered = filtered.filter(d => d.subtopic === subtopic);

    const indicators = [...new Set(filtered.map(d => `${d.indicator_id}||${d.indicator}`))];
    const select = document.getElementById("indicator-select");
    select.innerHTML = indicators.map(v => {
      const [id, name] = v.split("||");
      return `<option value="${id}">${name}</option>`;
    }).join("");
  }

  filterData() {
    const topic = document.getElementById("topic-select").value;
    const subtopic = this.hasSubtopic ? document.getElementById("subtopic-select").value : null;
    const indicator_id = document.getElementById("indicator-select").value;
    const geo = document.getElementById("geo-select").value;
    const year = document.getElementById("year-select").value;
    const freq = document.getElementById("frequency-select").value;

    return this.data.filter(d =>
      d.topic === topic &&
      (!this.hasSubtopic || d.subtopic === subtopic) &&
      d.indicator_id === indicator_id &&
      d.geography === geo &&
      (year === "All" || d.year == year) &&
      (freq === "" || d.frequency === freq)
    );
  }

  update() {
    const filtered = this.filterData();
    this.renderChart(filtered);
    this.renderTable(filtered);
    this.renderMetadata(filtered[0]);
  }

  renderChart(data) {
    const ctx = document.getElementById("fwd-chart");
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.map(d => d.period || d.year),
        datasets: [{
          label: data[0]?.indicator || "",
          data: data.map(d => d.value),
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
          tension: 0.1
        }]
      },
      options: { responsive: true, plugins: { legend: { display: true } } }
    });
  }

  renderTable(data) {
    const container = document.getElementById("fwd-table-container");
    container.innerHTML = `
      <table id="fwd-table">
        <thead>
          <tr>
            <th>Period/Year</th><th>Value</th><th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(d => `<tr><td>${d.period || d.year}</td><td>${d.value}</td><td>${d.unit}</td></tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  renderMetadata(d) {
    const container = document.getElementById("fwd-metadata-container");
    if (!d) { container.innerHTML = "<p>No metadata available</p>"; return; }

    container.innerHTML = `
      <h3>${d.indicator}</h3>
      <p><strong>Definition:</strong> ${d.definition || "N/A"}</p>
      <p><strong>Calculation Method:</strong> ${d.calculation_method || "N/A"}</p>
      <p><strong>Source:</strong> <a href="${d.source_url}" target="_blank">${d.source_name || "N/A"}</a></p>
      <p><strong>Dataset:</strong> <a href="${d.dataset_url}" target="_blank">${d.dataset_name || "N/A"}</a></p>
      <p><strong>Frequency:</strong> ${d.frequency || "N/A"}</p>
      <p><strong>Last Updated:</strong> ${d.last_updated || "N/A"}</p>
      <p><strong>Notes:</strong> ${d.notes || ""}</p>
    `;
  }

  showChart() { document.getElementById("fwd-chart").style.display="block"; document.getElementById("fwd-table-container").style.display="none"; document.getElementById("fwd-metadata-container").style.display="none"; }
  showTable() { document.getElementById("fwd-chart").style.display="none"; document.getElementById("fwd-table-container").style.display="block"; document.getElementById("fwd-metadata-container").style.display="none"; }
  showMetadata() { document.getElementById("fwd-chart").style.display="none"; document.getElementById("fwd-table-container").style.display="none"; document.getElementById("fwd-metadata-container").style.display="block"; }

  downloadCSV() {
    const data = this.filterData();
    if (data.length === 0) return alert("No data to download");
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(row => headers.map(h => row[h]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "filtered-data.csv";
    link.click();
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const explorer = new FunWithDataExplorer(
    "fwd-data-explorer",
    "https://raw.githubusercontent.com/danghenry/data-explorer/refs/heads/main/explorer.csv"
  );
  explorer.init();
});



