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

// -------- ROOT --------
app.get("/", (req, res) => {
  res.send("Curalink Backend Running");
});

// -------- MAIN API --------
app.get("/search/all", async (req, res) => {
  try {
    const query = req.query.q;
    const userId = req.query.user || "default";

    if (!query) {
      return res.json({ answer: "No query provided", papers: [], trials: [] });
    }

    // -------- QUERY EXPANSION (VERY IMPORTANT) --------
    const expandedQuery = `${query} disease treatment therapy clinical research`;

    const prevContext = userMemory[userId] || "";
    const finalQuery = prevContext
      ? `${prevContext} AND ${expandedQuery}`
      : expandedQuery;

    userMemory[userId] = finalQuery;

    let papers = [];
    let trials = [];

    // -------- OPENALEX --------
    try {
      const resOA = await axios.get(
        `https://api.openalex.org/works?search=${finalQuery}&per-page=40&sort=publication_date:desc`
      );

      papers = resOA.data.results.map(p => ({
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
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${finalQuery}&retmax=15&retmode=json`
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
      const ctRes = await axios.get(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${query}&pageSize=10&format=json`
      );

      trials = ctRes.data.studies.map(t => ({
        title: t.protocolSection.identificationModule.briefTitle,
        status: t.protocolSection.statusModule.overallStatus,
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
        const q = query.toLowerCase();

        let score = 0;

        if (title.includes(q)) score += 5;

        q.split(" ").forEach(word => {
          if (title.includes(word)) score += 1;
        });

        if (title.includes("treatment")) score += 2;
        if (title.includes("therapy")) score += 2;
        if (title.includes("cancer")) score += 2;
        if (title.includes("clinical")) score += 1;

        const yearNum = parseInt(p.year);
        if (!isNaN(yearNum)) score += yearNum / 1000;

        return { ...p, score };
      })
      .filter(p => p.score >= 4)
      .sort((a, b) => b.score - a.score);

    const topPapers = papers.slice(0, 6);
    const topTrials = trials.slice(0, 4);

    // -------- FALLBACK AI (SAFE + STRONG) --------
    const aiAnswer = `
Condition Overview:
${query} research focuses on diagnosis, treatment, and clinical outcomes.

Key Research Insights:
${topPapers.map(p => `• ${p.title}`).join("\n")}

Clinical Significance:
Recent studies show improved therapies, early detection, and survival strategies.

Notable Trends:
Emerging targeted therapies and clinical trials are shaping future treatment pathways.

Summary:
There is continuous advancement in ${query} through research and clinical trials.
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
