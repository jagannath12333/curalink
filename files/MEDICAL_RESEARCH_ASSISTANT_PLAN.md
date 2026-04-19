# AI Medical Research Assistant - Execution Plan
## MERN Stack Hackathon Build

---

## PART 1: STEP-BY-STEP BACKEND BUILD ORDER

### Day 1: Core Infrastructure (4-5 hours)

1. **Initialize Node.js + Express**
   - `npm init -y`
   - `npm install express cors dotenv axios mongoose`
   - Create basic server structure
   - Set up error handling middleware

2. **Set up Database (MongoDB)**
   - Create local MongoDB instance (or MongoDB Atlas cloud)
   - Define basic schemas for: queries, cached results, session context
   - Connect Mongoose

3. **Implement PubMed API Client**
   - Build `/services/pubmed.js` with fetch logic
   - Test with 1-2 queries
   - Store raw results in database

4. **Implement OpenAlex API Client**
   - Build `/services/openAlex.js`
   - Test with same queries
   - Verify response structure

5. **Implement ClinicalTrials.gov API Client**
   - Build `/services/clinicalTrials.js`
   - Test with same queries
   - Store results

6. **Create Basic Express Routes**
   - `POST /api/search` (accepts disease + query)
   - Returns raw combined results (no ranking yet)
   - Test with Postman/curl

### Day 2: Ranking + LLM Integration (4-5 hours)

1. **Build Ranking Algorithm**
   - Implement scoring function
   - Create `/services/ranking.js`
   - Test on real results from Day 1

2. **Integrate Open-Source LLM**
   - Set up Ollama (or HuggingFace if remote)
   - Create `/services/llm.js` client
   - Build prompt templates

3. **Create Response Generation Endpoint**
   - `POST /api/generate-summary` (takes top 6-8 results)
   - LLM processes and outputs structured JSON
   - Returns to frontend

4. **Add Context/Session Management**
   - Store conversation history in MongoDB
   - `POST /api/follow-up` (accepts follow-up question + session ID)
   - Pass previous context to LLM

5. **Build Simple Frontend Routes**
   - `GET /api/results/:sessionId` (retrieve past results)
   - Error handling and logging

---

## PART 2: FOLDER STRUCTURE

```
medical-research-assistant/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   │
│   ├── models/
│   │   ├── Query.js             # Search query history
│   │   ├── Result.js            # Cached results
│   │   └── Session.js           # Conversation sessions
│   │
│   ├── services/
│   │   ├── pubmed.js            # PubMed API client
│   │   ├── openAlex.js          # OpenAlex API client
│   │   ├── clinicalTrials.js    # ClinicalTrials.gov API client
│   │   ├── ranking.js           # Ranking algorithm
│   │   ├── llm.js               # Ollama/HuggingFace client
│   │   └── queryExpander.js     # Query expansion logic
│   │
│   ├── routes/
│   │   ├── search.js            # Search endpoints
│   │   ├── results.js           # Result retrieval
│   │   └── conversation.js      # Follow-up questions
│   │
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   └── logger.js            # Request logging
│   │
│   ├── utils/
│   │   ├── constants.js         # API keys, URLs
│   │   └── helpers.js           # Utility functions
│   │
│   ├── .env
│   ├── .env.example
│   ├── server.js                # Main entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ResultsList.jsx
│   │   │   ├── SummaryPanel.jsx
│   │   │   └── ChatHistory.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Results.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios config + API calls
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
└── README.md
```

---

## PART 3: PUBMED API IMPLEMENTATION

### How PubMed API Works
- Free, no authentication needed
- Base URL: `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`
- Two-step process: (1) Search → get IDs, (2) Fetch → get details

### Code: `/backend/services/pubmed.js`

```javascript
const axios = require('axios');

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PUBMED_DB = 'pubmed';

class PubMedClient {
  /**
   * Search PubMed for papers
   * @param {string} query - Search query (e.g., "diabetes treatment")
   * @param {number} maxResults - Max papers to fetch (default 50)
   */
  async searchPapers(query, maxResults = 50) {
    try {
      // Step 1: Search and get IDs
      const searchResponse = await axios.get(`${PUBMED_BASE}/esearch.fcgi`, {
        params: {
          db: PUBMED_DB,
          term: query,
          retmax: maxResults,
          rettype: 'json',
          sort: 'relevance', // or 'date' for recency
        },
      });

      const pmids = searchResponse.data.esearchresult.idlist;
      if (!pmids || pmids.length === 0) {
        return [];
      }

      // Step 2: Fetch full details for each ID
      const fetchResponse = await axios.get(`${PUBMED_BASE}/efetch.fcgi`, {
        params: {
          db: PUBMED_DB,
          id: pmids.join(','),
          rettype: 'json',
        },
      });

      // Parse and structure results
      return this._parseResults(fetchResponse.data);
    } catch (error) {
      console.error('PubMed Search Error:', error.message);
      throw error;
    }
  }

  _parseResults(data) {
    const articles = data.result.uids.map((uid) => {
      const article = data.result[uid];
      return {
        id: uid,
        title: article.title || 'N/A',
        authors: article.authors?.map((a) => a.name).join(', ') || 'N/A',
        abstract: article.abstract || 'No abstract available',
        pubDate: article.pubdate || 'N/A',
        journal: article.source || 'N/A',
        source: 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
        citationCount: null, // PubMed doesn't provide this directly
      };
    });

    return articles;
  }
}

module.exports = new PubMedClient();
```

### How to Test
```bash
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes%20treatment&retmax=5&rettype=json"
```

---

## PART 4: OPENÄLEX API IMPLEMENTATION

### How OpenAlex Works
- Free API, no authentication required
- Base URL: `https://api.openalex.org/`
- Returns citation counts, publication dates, open access status
- Better for ranking (has relevance scores and citations)

### Code: `/backend/services/openAlex.js`

```javascript
const axios = require('axios');

const OPENALEX_BASE = 'https://api.openalex.org';

class OpenAlexClient {
  /**
   * Search OpenAlex for papers
   * @param {string} query - Search query
   * @param {number} maxResults - Max papers to fetch
   */
  async searchPapers(query, maxResults = 50) {
    try {
      const response = await axios.get(`${OPENALEX_BASE}/works`, {
        params: {
          search: query,
          per_page: maxResults,
          sort: 'cited_by_count:desc', // Sort by citation count
          'filter': 'language:en', // English papers only
        },
      });

      return this._parseResults(response.data.results);
    } catch (error) {
      console.error('OpenAlex Search Error:', error.message);
      throw error;
    }
  }

  _parseResults(results) {
    return results.map((work) => ({
      id: work.id.split('/').pop(), // Extract ID from URI
      title: work.title || 'N/A',
      authors: work.author_count || 0,
      abstract: work.abstract_inverted_index
        ? this._reconstructAbstract(work.abstract_inverted_index)
        : 'No abstract available',
      pubDate: work.publication_date || 'N/A',
      journal: work.host_venue?.display_name || 'N/A',
      source: 'OpenAlex',
      url: work.url || work.doi || 'N/A',
      citationCount: work.cited_by_count || 0,
      isOpenAccess: work.is_open_access || false,
      relevanceScore: work.relevance_score || 0,
    }));
  }

  _reconstructAbstract(invertedIndex) {
    // OpenAlex returns abstract as inverted index, reconstruct it
    const abstract = new Array(
      Math.max(...Object.values(invertedIndex).flat()) + 1
    ).fill('');

    Object.entries(invertedIndex).forEach(([word, positions]) => {
      positions.forEach((pos) => {
        abstract[pos] = word;
      });
    });

    return abstract.join(' ').substring(0, 500); // Limit to 500 chars
  }
}

module.exports = new OpenAlexClient();
```

### How to Test
```bash
curl "https://api.openalex.org/works?search=diabetes%20treatment&per_page=5&sort=cited_by_count:desc"
```

---

## PART 5: CLINICALTRIALS.GOV API IMPLEMENTATION

### How ClinicalTrials API Works
- Free API, no authentication
- Base URL: `https://clinicaltrials.gov/api/v2/studies`
- Returns trial status, enrollment, conditions, locations
- Useful for current/recruiting trials

### Code: `/backend/services/clinicalTrials.js`

```javascript
const axios = require('axios');

const CT_BASE = 'https://clinicaltrials.gov/api/v2/studies';

class ClinicalTrialsClient {
  /**
   * Search ClinicalTrials.gov for active trials
   * @param {string} condition - Disease name
   * @param {number} maxResults - Max trials to fetch
   */
  async searchTrials(condition, maxResults = 50) {
    try {
      const response = await axios.get(CT_BASE, {
        params: {
          query: {
            condition: [condition],
            // Filter for recruiting/active trials
            statusModule: {
              overallStatus: ['RECRUITING', 'ACTIVE_NOT_RECRUITING'],
            },
          },
          pageSize: maxResults,
          fields: [
            'NCTId',
            'Condition',
            'InterventionName',
            'LocationCity',
            'LocationCountry',
            'StatusModule',
            'ProtocolSection',
            'BriefTitle',
            'OfficialTitle',
            'BriefSummary',
          ],
        },
      });

      return this._parseResults(response.data.studies);
    } catch (error) {
      console.error('ClinicalTrials Search Error:', error.message);
      throw error;
    }
  }

  _parseResults(studies) {
    return studies.map((study) => {
      const info = study.protocolSection;
      const status = info.statusModule;

      return {
        id: study.nctId,
        title: info.identificationModule?.officialTitle || info.identificationModule?.briefTitle || 'N/A',
        condition: info.conditionsModule?.conditions?.[0] || 'N/A',
        summary: info.descriptionModule?.briefSummary || 'No summary available',
        status: status.overallStatus || 'N/A',
        phase: info.designModule?.phases?.[0] || 'N/A',
        enrollment: status.enrollmentInfo?.anticipatedTotalEnrollment || 'N/A',
        source: 'ClinicalTrials',
        url: `https://clinicaltrials.gov/ct2/show/${study.nctId}`,
        startDate: status.startDateStruct?.date || 'N/A',
        recruitingStatus: status.overallStatus,
      };
    });
  }
}

module.exports = new ClinicalTrialsClient();
```

### How to Test
```bash
curl "https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=5"
```

---

## PART 6: RANKING ALGORITHM

### Ranking Logic
1. **Relevance** (40%): Keyword match in title/abstract
2. **Recency** (30%): How recent the publication/trial is
3. **Credibility** (30%): Citation count, journal impact, or trial phase

### Code: `/backend/services/ranking.js`

```javascript
class RankingService {
  /**
   * Combine results from all sources and rank them
   * @param {array} pubmedResults - PubMed papers
   * @param {array} openAlexResults - OpenAlex papers
   * @param {array} clinicalTrialsResults - Clinical trials
   * @param {string} query - Original search query (for relevance scoring)
   */
  rankResults(pubmedResults, openAlexResults, clinicalTrialsResults, query) {
    // Combine all results
    const allResults = [
      ...pubmedResults.map((r) => ({ ...r, type: 'paper' })),
      ...openAlexResults.map((r) => ({ ...r, type: 'paper' })),
      ...clinicalTrialsResults.map((r) => ({ ...r, type: 'trial' })),
    ];

    // Score each result
    const scoredResults = allResults.map((result) => ({
      ...result,
      score: this._calculateScore(result, query),
    }));

    // Sort by score, return top 6-8
    return scoredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  _calculateScore(result, query) {
    const relevanceScore = this._scoreRelevance(result, query);
    const recencyScore = this._scoreRecency(result);
    const credibilityScore = this._scoreCredibility(result);

    // Weighted combination
    return (
      relevanceScore * 0.4 +
      recencyScore * 0.3 +
      credibilityScore * 0.3
    );
  }

  _scoreRelevance(result, query) {
    // Simple keyword matching (can be enhanced with TF-IDF or semantic similarity)
    const text = `${result.title} ${result.abstract}`.toLowerCase();
    const keywords = query.toLowerCase().split(' ');

    const matches = keywords.filter((kw) => text.includes(kw)).length;
    return Math.min(matches / keywords.length, 1); // Normalize 0-1
  }

  _scoreRecency(result) {
    // Papers/trials from the last 2 years score higher
    const pubDate = result.pubDate || result.startDate;
    if (!pubDate) return 0.5; // Default middle score

    const published = new Date(pubDate);
    const now = new Date();
    const yearsOld = (now - published) / (1000 * 60 * 60 * 24 * 365);

    // Decay score: 1.0 if < 6 months, 0.5 if 2 years, approaches 0 after 5 years
    return Math.max(1 - yearsOld / 5, 0);
  }

  _scoreCredibility(result) {
    let credScore = 0;

    if (result.type === 'paper') {
      // For papers: citations and open access boost credibility
      const citationScore = Math.min(result.citationCount / 100, 1); // Normalize
      const openAccessBoost = result.isOpenAccess ? 0.2 : 0;
      credScore = (citationScore * 0.8 + openAccessBoost);
    } else if (result.type === 'trial') {
      // For trials: phase and recruiting status
      const phaseScore = this._getPhaseScore(result.phase);
      const statusBoost = result.recruitingStatus === 'RECRUITING' ? 0.3 : 0;
      credScore = (phaseScore * 0.7 + statusBoost);
    }

    return Math.min(credScore, 1);
  }

  _getPhaseScore(phase) {
    // Higher phases = higher credibility
    const phaseScores = {
      'PHASE_4': 1.0,
      'Phase 4': 1.0,
      'PHASE_3': 0.9,
      'Phase 3': 0.9,
      'PHASE_2': 0.7,
      'Phase 2': 0.7,
      'PHASE_1': 0.5,
      'Phase 1': 0.5,
      'EARLY_PHASE_1': 0.3,
    };
    return phaseScores[phase] || 0.5;
  }
}

module.exports = new RankingService();
```

---

## PART 7: LLM PROMPT TEMPLATE

### Setup Ollama (or HuggingFace)

**Option A: Ollama (Local, Fast, Recommended)**
```bash
# Install from https://ollama.ai
# Pull a model (e.g., Mistral 7B is fast and good)
ollama pull mistral

# Start server (runs on localhost:11434)
ollama serve
```

**Option B: HuggingFace (Remote)**
```bash
# No setup needed, just API calls
# Example: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.1
```

### Code: `/backend/services/llm.js`

```javascript
const axios = require('axios');

class LLMService {
  constructor() {
    // Use Ollama locally (faster) or HuggingFace API
    this.ollama_url = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
    this.model = process.env.LLM_MODEL || 'mistral';
  }

  /**
   * Generate structured medical response from top results
   * @param {array} topResults - Top 6-8 ranked results
   * @param {string} originalQuery - User's original question
   * @param {array} conversationHistory - Previous messages (for context)
   */
  async generateSummary(topResults, originalQuery, conversationHistory = []) {
    const prompt = this._buildPrompt(topResults, originalQuery, conversationHistory);

    try {
      const response = await axios.post(this.ollama_url, {
        model: this.model,
        prompt,
        stream: false,
        temperature: 0.3, // Lower = more focused
      });

      // Parse LLM response into structured JSON
      return this._parseResponse(response.data.response);
    } catch (error) {
      console.error('LLM Generation Error:', error.message);
      throw error;
    }
  }

  _buildPrompt(topResults, query, history) {
    // Format results for LLM
    const resultsText = topResults
      .map(
        (r, i) =>
          `[${i + 1}] "${r.title}"
Source: ${r.source}
Date: ${r.pubDate || r.startDate}
Summary: ${r.abstract}
URL: ${r.url}`
      )
      .join('\n\n');

    // Build conversation context if available
    const historyText = history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `You are a medical research assistant. Analyze the following research papers and clinical trials, then answer the user's question in structured JSON format.

USER'S QUESTION: "${query}"

${historyText ? `CONVERSATION CONTEXT:\n${historyText}\n\n` : ''}RESEARCH RESULTS:
${resultsText}

RESPOND IN THIS EXACT JSON FORMAT (no other text):
{
  "summary": "2-3 sentence summary of findings",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "nextSteps": ["step 1", "step 2"],
  "sources": [
    {
      "title": "paper/trial title",
      "url": "url",
      "why": "why this source is relevant"
    }
  ],
  "followUpQuestions": ["question 1", "question 2"]
}`;
  }

  _parseResponse(rawResponse) {
    try {
      // Extract JSON from response (LLM might include extra text)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      console.error('JSON Parse Error:', error.message);
      // Return fallback structure
      return {
        summary: rawResponse.substring(0, 500),
        keyFindings: [],
        recommendations: [],
        nextSteps: [],
        sources: [],
        followUpQuestions: [],
      };
    }
  }
}

module.exports = new LLMService();
```

---

## PART 8: DAY 1 vs DAY 2 BUILD CHECKLIST

### DAY 1 (4-5 hours) - Core APIs + Database
- [ ] Node.js + Express setup
- [ ] MongoDB schema (Query, Result, Session)
- [ ] PubMed API client (working + tested)
- [ ] OpenAlex API client (working + tested)
- [ ] ClinicalTrials API client (working + tested)
- [ ] `/api/search` endpoint (returns raw results from all 3 sources)
- [ ] Database caching (cache results for 24 hours)
- [ ] Error handling middleware
- **STOP HERE if short on time.** You have a working research aggregator.

### DAY 2 (4-5 hours) - Ranking + LLM + Frontend
- [ ] Ranking algorithm implementation
- [ ] Ollama setup (or HuggingFace integration)
- [ ] LLM client
- [ ] `/api/generate-summary` endpoint
- [ ] Session/context management (`POST /api/follow-up`)
- [ ] React frontend (SearchBar + ResultsList + SummaryPanel)
- [ ] Follow-up conversation UI
- [ ] Styling + polish

---

## PART 9: EXPRESS ROUTES (Main Endpoints)

### `/backend/routes/search.js`

```javascript
const express = require('express');
const router = express.Router();
const pubmedClient = require('../services/pubmed');
const openAlexClient = require('../services/openAlex');
const clinicalTrialsClient = require('../services/clinicalTrials');
const rankingService = require('../services/ranking');
const { Query, Result, Session } = require('../models');

/**
 * POST /api/search
 * Body: { disease: string, query: string }
 * Returns: { sessionId, topResults: [] }
 */
router.post('/search', async (req, res, next) => {
  try {
    const { disease, query } = req.body;

    if (!disease || !query) {
      return res.status(400).json({ error: 'Missing disease or query' });
    }

    const searchQuery = `${disease} ${query}`;

    // Create session for conversation history
    const session = await Session.create({
      disease,
      initialQuery: query,
      messages: [{ role: 'user', content: query }],
    });

    // Fetch from all sources in parallel
    const [pubmedResults, openAlexResults, clinicalTrialsResults] = await Promise.all([
      pubmedClient.searchPapers(searchQuery, 50).catch(() => []),
      openAlexClient.searchPapers(searchQuery, 50).catch(() => []),
      clinicalTrialsClient.searchTrials(disease, 50).catch(() => []),
    ]);

    // Rank and get top 8
    const topResults = rankingService.rankResults(
      pubmedResults,
      openAlexResults,
      clinicalTrialsResults,
      searchQuery
    );

    // Cache results
    await Result.create({
      sessionId: session._id,
      results: topResults,
      query: searchQuery,
    });

    // Store query metadata
    await Query.create({
      disease,
      query,
      resultCount: topResults.length,
    });

    res.json({
      sessionId: session._id,
      resultCount: topResults.length,
      topResults: topResults.map((r) => ({
        id: r.id,
        title: r.title,
        source: r.source,
        pubDate: r.pubDate,
        url: r.url,
        score: r.score.toFixed(2),
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## PART 10: COMMON MISTAKES TO AVOID

### ❌ Mistake 1: Ignoring API Rate Limits
- **Problem**: PubMed/OpenAlex will block you if you hammer them
- **Solution**: Add request throttling (1 req/sec), cache aggressively, use exponential backoff

### ❌ Mistake 2: Parsing XML/JSON Badly
- **Problem**: PubMed returns multiple formats, failing to parse breaks flow
- **Solution**: Use `.catch(() => [])` to gracefully handle failed API calls, never expect perfect data

### ❌ Mistake 3: Ranking Without Context
- **Problem**: Generic relevance scoring ignores medical domain nuances
- **Solution**: Boost recent papers, clinical trials in recruiting phase, and papers with many citations

### ❌ Mistake 4: No Error Boundaries
- **Problem**: One API failure crashes entire backend
- **Solution**: Wrap all API calls in try-catch, return partial results if some sources fail

### ❌ Mistake 5: LLM Hallucination
- **Problem**: LLM invents sources or misquotes papers
- **Solution**: Only pass real results to LLM, ask it to cite only from provided sources, validate URLs

### ❌ Mistake 6: Storing Raw LLM Responses
- **Problem**: If format changes, frontend breaks
- **Solution**: Always parse/validate LLM output against a schema before storing

### ❌ Mistake 7: No Session Context
- **Problem**: Each request is stateless, follow-ups can't reference previous queries
- **Solution**: Store sessionId in MongoDB, pass conversation history to LLM each time

### ❌ Mistake 8: Ignoring Duplicate Results
- **Problem**: Same paper in PubMed + OpenAlex counts twice
- **Solution**: Deduplicate by title/DOI before ranking

### ❌ Mistake 9: Frontend Requests Too Large
- **Problem**: Sending 50 results to frontend is slow
- **Solution**: Only send top 8, include full details client-side on request

### ❌ Mistake 10: Ollama Timeout
- **Problem**: Mistral model takes 30+ seconds on slow machine
- **Solution**: Set shorter timeouts, use lightweight model (Phi instead of Llama), or reduce max_tokens

---

## PART 11: MINIMAL EXPRESS SERVER SETUP

### `/backend/server.js`

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medical_research')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB Error:', err));

// Routes
app.use('/api', require('./routes/search'));
app.use('/api', require('./routes/results'));
app.use('/api', require('./routes/conversation'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### `/backend/.env`

```
MONGO_URI=mongodb://localhost:27017/medical_research
OLLAMA_URL=http://localhost:11434/api/generate
LLM_MODEL=mistral
NODE_ENV=development
PORT=5000
```

---

## PART 12: MINIMAL MONGODB SCHEMAS

### `/backend/models/index.js`

```javascript
const mongoose = require('mongoose');

// Query History
const querySchema = new mongoose.Schema({
  disease: String,
  query: String,
  resultCount: Number,
  createdAt: { type: Date, default: Date.now },
});

// Cached Results
const resultSchema = new mongoose.Schema({
  sessionId: mongoose.Schema.Types.ObjectId,
  query: String,
  results: [mongoose.Schema.Types.Mixed],
  generatedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(+new Date() + 24 * 60 * 60 * 1000) }, // 24 hour TTL
});

// Conversation Sessions
const sessionSchema = new mongoose.Schema({
  disease: String,
  initialQuery: String,
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant'] },
      content: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Query: mongoose.model('Query', querySchema),
  Result: mongoose.model('Result', resultSchema),
  Session: mongoose.model('Session', sessionSchema),
};
```

---

## PART 13: REACT FRONTEND MINIMAL SETUP

### `/frontend/src/services/api.js`

```javascript
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const searchMedical = (disease, query) =>
  axios.post(`${API_BASE}/search`, { disease, query });

export const generateSummary = (sessionId, topResults) =>
  axios.post(`${API_BASE}/generate-summary`, { sessionId, topResults });

export const followUp = (sessionId, question) =>
  axios.post(`${API_BASE}/follow-up`, { sessionId, question });
```

### `/frontend/src/components/SearchBar.jsx`

```javascript
import React, { useState } from 'react';
import { searchMedical } from '../services/api';

export default function SearchBar({ onResults, setLoading }) {
  const [disease, setDisease] = useState('');
  const [query, setQuery] = useState('');

  const handleSearch = async () => {
    if (!disease || !query) return;
    setLoading(true);
    try {
      const { data } = await searchMedical(disease, query);
      onResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <input
        placeholder="Disease (e.g., diabetes)"
        value={disease}
        onChange={(e) => setDisease(e.target.value)}
        style={{ marginRight: '10px', padding: '8px' }}
      />
      <input
        placeholder="Your question"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginRight: '10px', padding: '8px' }}
      />
      <button onClick={handleSearch} style={{ padding: '8px 16px' }}>
        Search
      </button>
    </div>
  );
}
```

---

## QUICK START

### 1. Backend Setup
```bash
cd backend
npm install
# Set up MongoDB locally or use Atlas
# Start Ollama: ollama serve
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npx create-react-app .
npm install axios
npm start
```

### 3. Test Flow
1. POST to `/api/search` with disease + query
2. Get top 8 results
3. POST to `/api/generate-summary` with top results
4. Get structured JSON response
5. Display in React

---

## SUCCESS CRITERIA FOR HACKATHON

- ✅ Search accepts disease + query
- ✅ Fetches from PubMed, OpenAlex, ClinicalTrials
- ✅ Returns top 8 ranked results
- ✅ LLM generates structured medical response
- ✅ Follow-up questions work
- ✅ Frontend displays results + summary
- ✅ No crashes on missing data

You're ready. Start with Day 1. Don't overthink. Ship it.
