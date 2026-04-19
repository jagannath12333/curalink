const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ===================== ROOT =====================
app.get("/", (req, res) => {
  res.send("Server running");
});

// ===================== COMBINED + LLM =====================
app.get("/search/all", async (req, res) => {
  try {
    const query = req.query.q;

    // ---------- OPENALEX (REDUCED LOAD) ----------
    const openalexRes = await axios.get(
      `https://api.openalex.org/works?search=${query}&per-page=10`
    );

    const openalexTop = openalexRes.data.results
      .map(item => ({
        title: item.display_name,
        year: item.publication_year,
        source: "OpenAlex",
        url: item.id
      }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 2); // reduced

    // ---------- PUBMED ----------
    const searchResponse = await axios.get(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=3&retmode=json`
    );

    const ids = searchResponse.data.esearchresult.idlist;

    let pubmedFormatted = [];

    if (ids && ids.length > 0) {

      await new Promise(resolve => setTimeout(resolve, 1000));

      const fetchResponse = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`
      );

      const parser = new xml2js.Parser();
      const parsed = await parser.parseStringPromise(fetchResponse.data);

      const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

      pubmedFormatted = articles.map(article => {
        const articleData = article.MedlineCitation[0].Article[0];

        return {
          title: articleData.ArticleTitle[0],
          year: articleData.Journal[0].JournalIssue[0].PubDate[0].Year
            ? articleData.Journal[0].JournalIssue[0].PubDate[0].Year[0]
            : "N/A",
          source: "PubMed"
        };
      }).slice(0, 2); // reduced
    }

    // ---------- COMBINE ----------
    const combined = [...openalexTop, ...pubmedFormatted];

    const filtered = combined.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase())
    );

    const finalPapers = filtered.length > 0 ? filtered : combined;

    // ---------- FAST LLM PROMPT ----------
    const llmPrompt = `
Explain briefly.

Query: ${query}

Papers:
${finalPapers.map(p => `- ${p.title}`).join("\n")}

Give:
1. Overview
2. Key points
3. Summary
`;

    const llmResponse = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "mistral", // ✅ CHANGED MODEL
        prompt: llmPrompt,
        stream: false
      }
    );

    const aiAnswer = llmResponse.data.response;

    res.json({
      answer: aiAnswer,
      papers: finalPapers
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Combined API error" });
  }
});

// ===================== SERVER =====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});