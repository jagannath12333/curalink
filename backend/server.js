const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// -------- MEMORY --------
const userMemory = {};

// -------- CLEAN QUERY --------
function cleanQuery(q) {
  return q.replace(/[^\w\s]/gi, "").toLowerCase().trim();
}

// -------- ROOT --------
app.get("/", (req, res) => {
  res.send("Curalink Backend Running");
});

// -------- MAIN API --------
app.get("/search/all", async (req, res) => {
  try {
    let query = req.query.q;
    const userId = req.query.user || "default";

    if (!query) {
      return res.json({ answer: "No query provided", papers: [], trials: [] });
    }

    // -------- CLEAN + EXPAND --------
    const cleaned = cleanQuery(query);

    const expandedQuery = `${cleaned} disease treatment therapy clinical research`;

    const prev = userMemory[userId] || "";
    const finalQuery = prev ? `${prev} AND ${expandedQuery}` : expandedQuery;

    userMemory[userId] = finalQuery;

    let papers = [];
    let trials = [];

    // -------- OPENALEX --------
    try {
      const oa = await axios.get(
        `https://api.openalex.org/works?search=${finalQuery}&per-page=40&sort=publication_date:desc`
      );

      papers = oa.data.results.map(p => ({
        title: p.display_name || "",
        year: p.publication_year || "N/A",
        source: "OpenAlex",
        url: p.id || ""
      }));
    } catch (e) {
      console.log("OpenAlex error:", e.message);
    }

    // -------- PUBMED --------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${finalQuery}&retmax=10&retmode=json`
      );

      const ids = searchRes.data?.esearchresult?.idlist || [];

      if (ids.length > 0) {
        const fetchRes = await axios.get(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`
        );

        const parser = new xml2js.Parser();
        const parsed = await parser.parseStringPromise(fetchRes.data);

        const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

        const pubmed = articles.map(a => {
          const art = a.MedlineCitation[0].Article[0];

          return {
            title: art?.ArticleTitle?.[0] || "",
            year:
              art?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] ||
              "N/A",
            source: "PubMed"
          };
        });

        papers = [...papers, ...pubmed];
      }
    } catch (e) {
      console.log("PubMed error:", e.message);
    }

    // -------- CLINICAL TRIALS --------
    try {
      const ct = await axios.get(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${cleaned}&pageSize=10&format=json`
      );

      trials = ct.data.studies.map(t => ({
        title: t.protocolSection.identificationModule.briefTitle || "",
        status: t.protocolSection.statusModule.overallStatus || "UNKNOWN",
        location:
          t.protocolSection.contactsLocationsModule?.locations?.[0]?.facility
            ?.city || "N/A"
      }));
    } catch (e) {
      console.log("Trials error:", e.message);
    }

    // -------- SMART RANKING --------
    papers = papers
      .map(p => {
        const title = (p.title || "").toLowerCase();
        let score = 0;

        if (title.includes(cleaned)) score += 5;

        cleaned.split(" ").forEach(word => {
          if (title.includes(word)) score += 1;
        });

        if (title.includes("treatment")) score += 2;
        if (title.includes("therapy")) score += 2;
        if (title.includes("cancer")) score += 2;

        const yearNum = parseInt(p.year);
        if (!isNaN(yearNum)) score += yearNum / 1000;

        return { ...p, score };
      })
      .filter(p => p.score >= 4)
      .sort((a, b) => b.score - a.score);

    const topPapers = papers.slice(0, 6);
    const topTrials = trials.slice(0, 4);

    // -------- SMART AI RESPONSE --------
    const aiAnswer = `
Condition Overview:
${cleaned} involves ongoing research in diagnosis, treatment strategies, and patient outcomes.

Research Insights:
Recent studies such as ${topPapers.slice(0, 3).map(p => p.title).join(", ")} suggest improvements in targeted therapies, early detection, and personalized medicine approaches.

Clinical Relevance:
These findings indicate better treatment planning, improved survival rates, and more effective disease management strategies.

Summary:
Overall, research and clinical trials are continuously advancing the understanding and treatment of ${cleaned}.
`;

    res.json({
      answer: aiAnswer,
      papers: topPapers,
      trials: topTrials
    });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: "Server failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
