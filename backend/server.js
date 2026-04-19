<!DOCTYPE html>
<html>
<head>
  <title>Curalink AI</title>

  <style>
    body {
      font-family: Arial;
      background: #f4f6fb;
      margin: 0;
    }

    .container {
      max-width: 900px;
      margin: auto;
      padding: 30px;
    }

    h1 {
      text-align: center;
      color: #1f3b57;
    }

    .search-box {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }

    input {
      flex: 1;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #ccc;
    }

    button {
      padding: 12px 20px;
      background: #007b8f;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    button:hover {
      background: #005f6b;
    }

    /* FILTER BUTTONS */
    .filters {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }

    .filter-btn {
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid #007b8f;
      background: white;
      color: #007b8f;
      cursor: pointer;
    }

    .filter-btn.active {
      background: #007b8f;
      color: white;
    }

    /* CARDS */
    .card {
      background: white;
      padding: 20px;
      margin-top: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);

      /* animation */
      opacity: 0;
      transform: translateY(10px);
      animation: fadeIn 0.4s ease forwards;
    }

    @keyframes fadeIn {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .section-title {
      font-weight: bold;
      margin-top: 15px;
      color: #2c3e50;
    }

    .paper, .trial {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }

    .paper:last-child,
    .trial:last-child {
      border-bottom: none;
    }

    .paper a {
      color: #007b8f;
      text-decoration: none;
    }

    .paper a:hover {
      text-decoration: underline;
    }

    .loading {
      margin-top: 20px;
      color: gray;
    }

    .hidden {
      display: none;
    }

  </style>
</head>

<body>

<div class="container">

  <h1>Curalink AI</h1>

  <div class="search-box">
    <input id="query" placeholder="e.g. lung cancer treatment">
    <button onclick="search()">Search</button>
  </div>

  <!-- FILTERS -->
  <div class="filters">
    <div class="filter-btn active" onclick="setFilter('all', this)">All</div>
    <div class="filter-btn" onclick="setFilter('papers', this)">Research Papers</div>
    <div class="filter-btn" onclick="setFilter('trials', this)">Clinical Trials</div>
  </div>

  <div id="loading" class="loading"></div>

  <div id="answer" class="card"></div>
  <div id="papers" class="card"></div>
  <div id="trials" class="card"></div>

</div>

<script>
let currentFilter = "all";

function setFilter(filter, btn) {
  currentFilter = filter;

  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  applyFilter();
}

function applyFilter() {
  document.getElementById("answer").classList.remove("hidden");
  document.getElementById("papers").classList.remove("hidden");
  document.getElementById("trials").classList.remove("hidden");

  if (currentFilter === "papers") {
    document.getElementById("trials").classList.add("hidden");
  }

  if (currentFilter === "trials") {
    document.getElementById("papers").classList.add("hidden");
  }
}

async function search() {
  const q = document.getElementById("query").value;

  document.getElementById("loading").innerText = "Loading...";
  document.getElementById("answer").innerHTML = "";
  document.getElementById("papers").innerHTML = "";
  document.getElementById("trials").innerHTML = "";

  const res = await fetch(`https://curalink-backend-h2rw.onrender.com/search/all?q=${q}`);
  const data = await res.json();

  document.getElementById("loading").innerText = "";

  // ---------- AI ----------
  const formattedAnswer = data.answer
    .replace(/\n/g, "<br>")
    .replace(/Condition Overview:/g, "<div class='section-title'>Condition Overview</div>")
    .replace(/Key Research Insights:/g, "<div class='section-title'>Key Research Insights</div>")
    .replace(/Clinical Significance:/g, "<div class='section-title'>Clinical Significance</div>")
    .replace(/Notable Trends:/g, "<div class='section-title'>Notable Trends</div>")
    .replace(/Summary:/g, "<div class='section-title'>Summary</div>");

  document.getElementById("answer").innerHTML = formattedAnswer;

  // ---------- PAPERS ----------
  let papersHTML = "<h3>Research Papers</h3>";

  data.papers.forEach(p => {
    papersHTML += `
      <div class="paper">
        <a href="${p.url}" target="_blank">${p.title}</a>
        <div>${p.year} • ${p.source}</div>
      </div>
    `;
  });

  document.getElementById("papers").innerHTML = papersHTML;

  // ---------- TRIALS ----------
  let trialsHTML = "<h3>Clinical Trials</h3>";

  if (data.trials.length === 0) {
    trialsHTML += "<p>No trials found</p>";
  } else {
    data.trials.forEach(t => {
      trialsHTML += `
        <div class="trial">
          <strong>${t.title}</strong><br>
          Status: ${t.status}<br>
          Location: ${t.location}
        </div>
      `;
    });
  }

  document.getElementById("trials").innerHTML = trialsHTML;

  applyFilter();
}
</script>

</body>
</html>
