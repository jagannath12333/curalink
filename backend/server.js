const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------- ROOT ----------
app.get("/", (req, res) => {
  res.send("Server running");
});

// ---------- CHECK HF KEY ----------
app.get("/check-key", (req, res) => {
  if (process.env.HF_API_KEY) {
    res.send("HF KEY LOADED");
  } else {
    res.send("NO HF KEY FOUND");
  }
});

// ---------- MAIN API ----------
app.get("/search/all", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.json({ answer: "No query provided", papers: [] });
    }

    let papers = [];

    // ---------- OPENALEX ----------
    try {
      const openalexRes = await axios.get(
        `https://api.openalex.org/works?search=${query}&per-page=10`
      );

      const openalexData = openalexRes.data.results.map(item => ({
        title: item.display_name,
        year: item.publication_year || "N/A",
        source: "OpenAlex",
        url: item.id
      }));

      papers = [...papers, ...openalexData];

    } catch (e) {
      console.log("OpenAlex ERROR:", e.message);
    }

    // ---------- PUBMED ----------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=5&retmode=json`
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
          const article = a.MedlineCitation[0].Article[0];
          return {
            title: article.ArticleTitle[0],
            year:
              article.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] ||
              "N/A",
            source: "PubMed"
          };
        });

        papers = [...papers, ...pubmed];
      }

    } catch (e) {
      console.log("PubMed ERROR:", e.message);
    }

    if (papers.length === 0) {
      return res.json({
        answer: "No research found",
        papers: []
      });
    }

    // ---------- LIMIT FINAL PAPERS ----------
    const topPapers = papers.slice(0, 6);

    // ---------- HUGGINGFACE AI ----------
    let aiAnswer = "Summary not available.";
    const HF_API_KEY = process.env.HF_API_KEY;

    if (!HF_API_KEY) {
      console.log("❌ HF KEY MISSING");
      aiAnswer = "AI not configured. Showing research results.";
    } else {
      try {
        const prompt = `
You are a medical research assistant.

User Query: ${query}

Research Papers:
${topPapers.map(p => `- ${p.title}`).join("\n")}

Provide structured output:
1. Condition Overview
2. Key Research Insights
3. Clinical Relevance
4. Summary
`;

        const response = await axios.post(
          "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
          {
            inputs: prompt
          },
          {
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 20000
          }
        );

        aiAnswer =
          response.data?.[0]?.generated_text ||
          "AI response could not be generated.";

      } catch (e) {
        console.log("❌ HF ERROR:", e.response?.data || e.message);
        aiAnswer = "Fallback: AI failed but research data is available.";
      }
    }

    res.json({
      answer: aiAnswer,
      papers: topPapers
    });

  } catch (error) {
    console.error("❌ SERVER ERROR:", error);
    res.status(500).json({ error: "Backend failed" });
  }
});

// ---------- SERVER ----------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
