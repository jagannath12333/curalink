const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("Server running");
});

// ===================== SEARCH =====================
app.get("/search/all", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.json({
        answer: "No query provided",
        papers: []
      });
    }

    let openalexTop = [];
    let pubmedFormatted = [];

    // ---------- OPENALEX ----------
    try {
      const openalexRes = await axios.get(
        `https://api.openalex.org/works?search=${query}&per-page=5`
      );

      openalexTop = openalexRes.data.results
        .map(item => ({
          title: item.display_name || "No title",
          year: item.publication_year || "N/A",
          source: "OpenAlex",
          url: item.id || ""
        }))
        .sort((a, b) => (b.year || 0) - (a.year || 0))
        .slice(0, 3);

    } catch (err) {
      console.log("OpenAlex failed:", err.message);
    }

    // ---------- PUBMED ----------
    try {
      const searchResponse = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=3&retmode=json`
      );

      const ids = searchResponse.data?.esearchresult?.idlist || [];

      if (ids.length > 0) {

        await new Promise(resolve => setTimeout(resolve, 1000));

        const fetchResponse = await axios.get(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`
        );

        const parser = new xml2js.Parser();
        const parsed = await parser.parseStringPromise(fetchResponse.data);

        const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

        pubmedFormatted = articles.map(article => {
          try {
            const articleData = article.MedlineCitation[0].Article[0];

            return {
              title: articleData.ArticleTitle?.[0] || "No title",
              year:
                articleData.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] ||
                "N/A",
              source: "PubMed"
            };
          } catch {
            return null;
          }
        }).filter(Boolean).slice(0, 3);
      }

    } catch (err) {
      console.log("PubMed failed:", err.message);
    }

    // ---------- COMBINE ----------
    const combined = [...openalexTop, ...pubmedFormatted];

    if (combined.length === 0) {
      return res.json({
        answer: "No research data found for this query.",
        papers: []
      });
    }

    // ---------- SIMPLE AI SUMMARY (NO LLM) ----------
    const titles = combined.map(p => p.title).slice(0, 5);

    const aiAnswer = `
Overview:
Research on "${query}" focuses on recent medical findings and treatment approaches.

Key Points:
- ${titles.join("\n- ")}

Summary:
These papers highlight current trends and advancements related to "${query}".
`;

    res.json({
      answer: aiAnswer,
      papers: combined
    });

  } catch (error) {
    console.error("Backend error:", error.message);

    res.status(500).json({
      error: "Backend failed",
      details: error.message
    });
  }
});

// ===================== SERVER =====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
