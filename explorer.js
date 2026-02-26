<script>
document.addEventListener("DOMContentLoaded", function () {

  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/1FO5cihbBfCeXxrEeSKiYJvNMAuPXsUkDdDqCAiYLXNw/export?format=csv&gid=0";

  fetch(CSV_URL)
    .then(response => response.text())
    .then(csvText => {

      const rows = csvText.trim().split("\n");
      const headers = rows[0].split(",");

      const data = rows.slice(1).map(row => {
        const values = row.split(",");
        let obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
        return obj;
      });

      console.log("CSV loaded. Rows:", data.length);
      console.log("First row:", data[0]);

      // Example: populate topic dropdown
      const topicSelect = document.getElementById("topic");

      const topics = [...new Set(data.map(d => d.Topic))];

      topics.forEach(topic => {
        const option = document.createElement("option");
        option.value = topic;
        option.textContent = topic;
        topicSelect.appendChild(option);
      });

    })
    .catch(error => {
      console.error("Error loading CSV:", error);
    });

});
</script>
