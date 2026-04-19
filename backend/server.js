const express = require("express");
const axios = require("axios");
const xml2js = require("xml2js");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server running");
});

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
        `https://api.openalex.org/works?search=${query}&per-page=5`
      );

      papers = openalexRes.data.results.map(item => ({
        title: item.display_name,
        year: item.publication_year || "N/A",
        source: "OpenAlex",
        url: item.id
      })).slice(0, 3);
    } catch (e) {
      console.log("OpenAlex error");
    }

    // ---------- PUBMED ----------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=3&retmode=json`
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
      console.log("PubMed error");
    }

    if (papers.length === 0) {
      return res.json({
        answer: "No research found",
        papers: []
      });
    }

    // ---------- REAL AI (OPENAI) ----------
    const OPENAI_KEY = process.env.OPENAI_API_KEY;

    let aiAnswer = "Summary not available.";

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: `Explain briefly about ${query} using these papers:\n${papers.map(p => p.title).join("\n")}`
            }
          ],
          max_tokens: 200
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      aiAnswer = response.data.choices[0].message.content;
    } catch (e) {
      console.log("OpenAI failed, using fallback");
      aiAnswer = `Research papers related to "${query}" show recent developments in treatment and diagnosis.`;
    }

    res.json({ answer: aiAnswer, papers });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Backend failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
