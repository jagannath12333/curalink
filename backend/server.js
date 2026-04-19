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

    // ---------- OPENALEX (DEEP FETCH) ----------
    try {
      const openalexRes = await axios.get(
        `https://api.openalex.org/works?search=${query}&per-page=50&sort=publication_date:desc`
      );

      papers = openalexRes.data.results.map(p => ({
        title: p.display_name,
        year: p.publication_year || "N/A",
        source: "OpenAlex",
        url: p.id
      }));

    } catch (e) {
      console.log("OpenAlex error");
    }

    // ---------- PUBMED ----------
    try {
      const searchRes = await axios.get(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=20&sort=pub+date&retmode=json`
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
            title: art.ArticleTitle[0],
            year:
              art.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0]?.Year?.[0] || "N/A",
            source: "PubMed"
          };
        });

        papers = [...papers, ...pubmed];
      }

    } catch (e) {
      console.log("PubMed error");
    }

    // ---------- CLINICAL TRIALS ----------
    try {
      const ctRes = await axios.get(
        `https://clinicaltrials.gov/api/v2/studies?query.cond=${query}&pageSize=20&format=json`
      );

      trials = ctRes.data.studies.map(t => ({
        title: t.protocolSection.identificationModule.briefTitle,
        status: t.protocolSection.statusModule.overallStatus,
        location:
          t.protocolSection.contactsLocationsModule?.locations?.[0]?.facility?.city || "N/A"
      }));

    } catch (e) {
      console.log("Clinical Trials error");
    }

    // ---------- RANK + FILTER ----------
    papers = papers
      .filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => (b.year || 0) - (a.year || 0));

    const topPapers = papers.slice(0, 6);
    const topTrials = trials.slice(0, 4);

    // ---------- AI / FALLBACK ----------
    let aiAnswer = "";

    try {
      const HF_API_KEY = process.env.HF_API_KEY;

      const response = await axios.post(
        "https://router.huggingface.co/hf-inference/models/google/flan-t5-base",
        {
          inputs: `Summarize research on ${query}:\n${topPapers.map(p => p.title).join("\n")}`
        },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`
          },
          timeout: 15000
        }
      );

      aiAnswer = response.data?.[0]?.generated_text;

      if (!aiAnswer) throw new Error();

    } catch {
      // ---------- SMART FALLBACK ----------
      aiAnswer = `
Condition Overview:
${query} research focuses on diagnosis, treatment, and outcomes.

Research Insights:
${topPapers.map(p => `- ${p.title}`).join("\n")}

Clinical Trials:
${topTrials.map(t => `- ${t.title} (${t.status})`).join("\n")}

Summary:
There are ongoing advancements in ${query}, with both clinical studies and research papers contributing to improved treatments.
`;
    }

    res.json({
      answer: aiAnswer,
      papers: topPapers,
      trials: topTrials
    });

  } catch (err) {
    res.status(500).json({ error: "Server failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
