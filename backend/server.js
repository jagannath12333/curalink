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
  res.send("Curalink Backend Running");
});

// ---------- MAIN ----------
app.get("/search/all", async (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.json({ answer: "No query provided", papers: [], trials: [] });
    }

    let papers = [];
    let trials = [];

    // ---------- OPENALEX ----------
    try {
      const openalexRes = await axios.get(
        `https://api.openalex.org/works?search=${query}&per-page=50`
      );

      papers = (openalexRes.data.results || []).map(p => ({
        title: p.display_name || "No title",
        year: p.publication_year || "N/A",
        source: "OpenAlex",
        url: p.id
      }));

    } catch (e) {
      console.log("OpenAlex error:", e.message);
    }

    // ---------- PUBMED ----------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=20&retmode=json`
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
          try {
            const art = a?.MedlineCitation?.[0]?.Article?.[0];

            return {
              title: art?.ArticleTitle?.[0] || "No title",
              year:
                art?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] || "N/A",
              source: "PubMed"
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        papers = [...papers, ...pubmed];
      }

    } catch (e) {
      console.log("PubMed error:", e.message);
    }

    // ---------- CLINICAL TRIALS ----------
    try {
      const ctRes = await axios.get(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${query}&pageSize=20&format=json`
      );

      trials = (ctRes.data.studies || []).map(t => ({
        title: t?.protocolSection?.identificationModule?.briefTitle || "No title",
        status: t?.protocolSection?.statusModule?.overallStatus || "Unknown",
        location:
          t?.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility?.city || "N/A"
      }));

    } catch (e) {
      console.log("Clinical Trials error:", e.message);
    }

    // ---------- RANK ----------
    papers = papers
      .filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.year || 0) - (a.year || 0));

    const topPapers = papers.slice(0, 6);
    const topTrials = trials.slice(0, 4);

    // ---------- HUGGINGFACE ----------
    let aiAnswer = "";

    try {
      const HF_API_KEY = process.env.HF_API_KEY;

      if (!HF_API_KEY) throw new Error("No HF key");

      const response = await axios.post(
        "https://api-inference.huggingface.co/models/google/flan-t5-base",
        {
          inputs: `Summarize research about ${query}:\n${topPapers.map(p => p.title).join("\n")}`
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000,
          validateStatus: () => true // prevents crash
        }
      );

      // ---------- SAFE PARSING ----------
      if (typeof response.data === "string") {
        throw new Error("HF returned HTML");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      aiAnswer = response.data?.[0]?.generated_text;

      if (!aiAnswer) throw new Error("Empty response");

    } catch (e) {
      console.log("HF FAILED:", e.message);

      // ---------- FALLBACK ----------
      aiAnswer = `
Condition Overview:
${query} research focuses on diagnosis, treatment, and outcomes.

Key Research Insights:
${topPapers.map(p => `- ${p.title}`).join("\n")}

Clinical Trials:
${topTrials.map(t => `- ${t.title} (${t.status})`).join("\n")}

Summary:
Ongoing research and clinical trials are improving treatment strategies for ${query}.
`;
    }

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

// ---------- SERVER ----------
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
