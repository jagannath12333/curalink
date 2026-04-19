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
    const query = req.query.q || "";
    const userId = req.query.user || "default";

    if (!query) {
      return res.json({ answer: "No query provided", papers: [], trials: [] });
    }

    // -------- CONTEXT --------
    const prevContext = userMemory[userId] || "";
    const finalQuery = prevContext ? `${prevContext} AND ${query}` : query;
    userMemory[userId] = finalQuery;

    let papers = [];
    let trials = [];

    // -------- OPENALEX --------
    try {
      const openalexRes = await axios.get(
        `https://api.openalex.org/works?search=${encodeURIComponent(finalQuery)}&per-page=30&sort=publication_date:desc`
      );

      papers = openalexRes.data.results.map(p => ({
        title: p.display_name || "No title",
        year: p.publication_year || "N/A",
        source: "OpenAlex",
        url: p.id || "#"
      }));
    } catch (e) {
      console.log("OpenAlex error:", e.message);
    }

    // -------- PUBMED --------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(finalQuery)}&retmax=15&retmode=json`
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
          const art = a?.MedlineCitation?.[0]?.Article?.[0] || {};
          return {
            title: art?.ArticleTitle?.[0] || "No title",
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
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(finalQuery)}&pageSize=10&format=json`
      );

      trials = (ctRes.data.studies || []).map(t => ({
        title:
          t?.protocolSection?.identificationModule?.briefTitle || "No title",
        status:
          t?.protocolSection?.statusModule?.overallStatus || "Unknown",
        location:
          t?.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility
            ?.city || "N/A"
      }));
    } catch (e) {
      console.log("Trials error:", e.message);
    }

    // -------- SAFE RANKING --------
    papers = papers
      .map(p => {
        const title = (p.title || "").toLowerCase();
        const q = (query || "").toLowerCase();

        let score = 0;

        if (title.includes(q)) score += 2;

        const yearNum = parseInt(p.year);
        if (!isNaN(yearNum)) score += yearNum / 1000;

        return { ...p, score };
      })
      .sort((a, b) => b.score - a.score);

    const topPapers = papers.slice(0, 6);
    const topTrials = trials.slice(0, 4);

    // -------- SMART FALLBACK (STRONG) --------
    let aiAnswer = `
Condition Overview:
${query} involves multiple clinical and research developments focusing on diagnosis, treatment, and patient outcomes.

Key Research Insights:
${topPapers.map(p => `- ${p.title}`).join("\n")}

Clinical Significance:
Recent studies indicate improvements in treatment strategies, early detection, and patient survival.

Notable Trends:
Emerging therapies and ongoing clinical trials are shaping future treatment pathways.

Summary:
Research and trials suggest continuous advancement in understanding and managing ${query}.
`;

    // -------- HUGGINGFACE AI --------
    try {
      const HF_API_KEY = process.env.HF_API_KEY;

      if (HF_API_KEY) {
        const prompt = `
You are an expert medical research assistant.

User Query: ${query}

Research Papers:
${topPapers.map(p => p.title).join("\n")}

Clinical Trials:
${topTrials.map(t => t.title).join("\n")}

Generate a structured response:

1. Condition Overview (specific, not generic)
2. Key Research Insights (identify trends across papers)
3. Clinical Significance (real-world meaning)
4. Notable Trends
5. Summary

IMPORTANT:
- Do not repeat titles
- Combine insights
- Be specific
`;

        const response = await axios.post(
          "https://api-inference.huggingface.co/models/google/flan-t5-base",
          { inputs: prompt },
          {
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`
            },
            timeout: 15000
          }
        );

        if (response.data?.[0]?.generated_text) {
          aiAnswer = response.data[0].generated_text;
        }
      }
    } catch (e) {
      console.log("HF failed → using fallback");
    }

    // -------- FINAL RESPONSE --------
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
