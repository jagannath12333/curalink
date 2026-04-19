# API RESPONSE EXAMPLES & DEBUGGING REFERENCE
## What each API returns, and what your code should produce

---

## PUBMED API RESPONSES

### Request
```bash
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes&retmax=2&rettype=json"
```

### Response (search)
```json
{
  "result": {
    "uids": ["38451234", "38451235"],
    "count": 5000,
    "retmax": 2,
    "retstart": 0
  }
}
```

### Request (fetch details)
```bash
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=38451234&rettype=json"
```

### Response (details)
```json
{
  "result": {
    "uids": ["38451234"],
    "38451234": {
      "title": "Efficacy and Safety of SGLT2 Inhibitors in Type 2 Diabetes",
      "authors": [
        { "name": "Smith J" },
        { "name": "Johnson A" }
      ],
      "abstract": "Background: SGLT2 inhibitors are...",
      "pubdate": "2024-01-15",
      "source": "Diabetes Care",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38451234/"
    }
  }
}
```

### Your Code Output (After parsing)
```json
{
  "id": "38451234",
  "title": "Efficacy and Safety of SGLT2 Inhibitors in Type 2 Diabetes",
  "authors": "Smith J, Johnson A",
  "abstract": "Background: SGLT2 inhibitors are...",
  "pubDate": "2024-01-15",
  "journal": "Diabetes Care",
  "source": "PubMed",
  "url": "https://pubmed.ncbi.nlm.nih.gov/38451234/",
  "citationCount": 0
}
```

---

## OPENALEX API RESPONSES

### Request
```bash
curl "https://api.openalex.org/works?search=diabetes&per_page=2&sort=cited_by_count:desc"
```

### Response
```json
{
  "results": [
    {
      "id": "https://openalex.org/W2741809807",
      "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
      "publication_date": "2023-06-15",
      "cited_by_count": 234,
      "host_venue": {
        "display_name": "The Lancet Diabetes & Endocrinology"
      },
      "is_open_access": true,
      "abstract_inverted_index": {
        "Background": [0],
        "glycemic": [1],
        "control": [2],
        "is": [3],
        "associated": [4]
      },
      "url": "https://openalex.org/W2741809807",
      "doi": "https://doi.org/10.1016/S2213-8587(23)00123-4"
    }
  ]
}
```

### Your Code Output (After parsing)
```json
{
  "id": "W2741809807",
  "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
  "authors": null,
  "abstract": "Background glycemic control is associated...",
  "pubDate": "2023-06-15",
  "journal": "The Lancet Diabetes & Endocrinology",
  "source": "OpenAlex",
  "url": "https://openalex.org/W2741809807",
  "citationCount": 234,
  "isOpenAccess": true
}
```

---

## CLINICALTRIALS.GOV API RESPONSES

### Request
```bash
curl "https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=2"
```

### Response
```json
{
  "studies": [
    {
      "nctId": "NCT05123456",
      "protocolSection": {
        "identificationModule": {
          "officialTitle": "A Phase 3 Study of GLP-1 Receptor Agonist in Type 2 Diabetes",
          "briefTitle": "GLP-1 in Type 2 Diabetes"
        },
        "statusModule": {
          "overallStatus": "RECRUITING",
          "startDateStruct": {
            "date": "2023-01-15"
          },
          "enrollmentInfo": {
            "anticipatedTotalEnrollment": 300
          }
        },
        "conditionsModule": {
          "conditions": ["Diabetes Mellitus, Type 2"]
        },
        "designModule": {
          "phases": ["Phase 3"]
        },
        "descriptionModule": {
          "briefSummary": "This study evaluates the efficacy of..."
        }
      }
    }
  ]
}
```

### Your Code Output (After parsing)
```json
{
  "id": "NCT05123456",
  "title": "A Phase 3 Study of GLP-1 Receptor Agonist in Type 2 Diabetes",
  "condition": "Diabetes Mellitus, Type 2",
  "summary": "This study evaluates the efficacy of...",
  "status": "RECRUITING",
  "phase": "Phase 3",
  "enrollment": 300,
  "source": "ClinicalTrials",
  "url": "https://clinicaltrials.gov/ct2/show/NCT05123456",
  "startDate": "2023-01-15"
}
```

---

## RANKING ALGORITHM OUTPUT

### Input (from all 3 sources combined)
```json
[
  { "id": "38451234", "source": "PubMed", "title": "SGLT2 Inhibitors...", "citationCount": 0, "pubDate": "2024-01-15" },
  { "id": "W2741809807", "source": "OpenAlex", "title": "Glycemic Control...", "citationCount": 234, "pubDate": "2023-06-15" },
  { "id": "NCT05123456", "source": "ClinicalTrials", "title": "GLP-1 Receptor Agonist...", "status": "RECRUITING", "phase": "Phase 3" }
]
```

### Output (top 8, ranked by score)
```json
{
  "topResults": [
    {
      "id": "W2741809807",
      "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
      "source": "OpenAlex",
      "pubDate": "2023-06-15",
      "url": "https://openalex.org/W2741809807",
      "score": 0.87,
      "type": "paper"
    },
    {
      "id": "NCT05123456",
      "title": "GLP-1 Receptor Agonist in Type 2 Diabetes",
      "source": "ClinicalTrials",
      "status": "RECRUITING",
      "phase": "Phase 3",
      "url": "https://clinicaltrials.gov/ct2/show/NCT05123456",
      "score": 0.82,
      "type": "trial"
    },
    {
      "id": "38451234",
      "title": "Efficacy and Safety of SGLT2 Inhibitors...",
      "source": "PubMed",
      "pubDate": "2024-01-15",
      "url": "https://pubmed.ncbi.nlm.nih.gov/38451234/",
      "score": 0.75,
      "type": "paper"
    }
  ]
}
```

**Scoring Breakdown for top result:**
- Relevance Score (40%): 0.95 → "diabetes" and "treatment" both found = 1.0 match
- Recency Score (30%): 0.92 → Published 7 months ago, still recent
- Credibility Score (30%): 0.75 → 234 citations + open access boost
- **Final = 0.95 × 0.4 + 0.92 × 0.3 + 0.75 × 0.3 = 0.87**

---

## LLM API RESPONSES

### Request (Ollama)
```bash
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "You are a medical assistant...\n\nRespond in JSON: {...}",
    "stream": false,
    "temperature": 0.3
  }'
```

### Raw Response (from Ollama)
```json
{
  "model": "mistral",
  "created_at": "2024-01-20T10:30:45.123456Z",
  "response": "{\"summary\": \"Type 2 diabetes treatments have evolved significantly...\", \"keyFindings\": [...]}",
  "done": true,
  "total_duration": 8234567890,
  "load_duration": 1234567890
}
```

### Your Code Parses This As
```json
{
  "summary": "Type 2 diabetes treatments have evolved significantly. GLP-1 receptor agonists and SGLT2 inhibitors show improved cardiovascular outcomes. Phase 3 trials demonstrate sustained efficacy over 2+ years.",
  "keyFindings": [
    "GLP-1 agonists reduce cardiovascular events by 25-35%",
    "SGLT2 inhibitors improve kidney function",
    "Combination therapy more effective than monotherapy"
  ],
  "recommendations": [
    "Initiate with metformin + GLP-1 agonist for new-onset Type 2 diabetes",
    "Monitor HbA1c every 3 months during titration",
    "Consider adding SGLT2 inhibitor if eGFR > 30"
  ],
  "nextSteps": [
    "Check HbA1c at 8 weeks",
    "Assess for neuropathy and retinopathy annually",
    "Enroll in Phase 3 trial if eligible"
  ],
  "sources": [
    {
      "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
      "url": "https://openalex.org/W2741809807",
      "why": "Provides latest evidence on treatment outcomes"
    }
  ]
}
```

---

## /API/SEARCH ENDPOINT OUTPUT

### Request
```json
POST /api/search
{
  "disease": "diabetes",
  "query": "Type 2 treatment"
}
```

### Response
```json
{
  "sessionId": "507f1f77bcf86cd799439011",
  "resultCount": 8,
  "topResults": [
    {
      "id": "W2741809807",
      "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
      "source": "OpenAlex",
      "pubDate": "2023-06-15",
      "url": "https://openalex.org/W2741809807",
      "score": "0.87"
    },
    {
      "id": "NCT05123456",
      "title": "GLP-1 Receptor Agonist in Type 2 Diabetes",
      "source": "ClinicalTrials",
      "pubDate": "2023-01-15",
      "url": "https://clinicaltrials.gov/ct2/show/NCT05123456",
      "score": "0.82"
    }
  ]
}
```

---

## /API/GENERATE-SUMMARY ENDPOINT OUTPUT

### Request
```json
POST /api/generate-summary
{
  "sessionId": "507f1f77bcf86cd799439011",
  "topResults": [
    { "id": "W2741809807", "title": "Glycemic Control...", ... },
    { "id": "NCT05123456", "title": "GLP-1 Receptor...", ... }
  ]
}
```

### Response
```json
{
  "summary": {
    "summary": "Modern Type 2 diabetes management emphasizes cardiovascular protection alongside glycemic control. GLP-1 receptor agonists are first-line for patients with existing cardiovascular disease.",
    "keyFindings": [
      "GLP-1 agonists reduce major adverse cardiovascular events (MACE) by 25-35%",
      "SGLT2 inhibitors preserve kidney function and reduce HF hospitalizations",
      "Combination therapy yields superior outcomes vs monotherapy"
    ],
    "recommendations": [
      "Start with metformin + GLP-1 agonist for new diagnoses",
      "Add SGLT2 inhibitor if eGFR >30 or history of heart failure",
      "Titrate to target HbA1c <7% for most patients"
    ],
    "nextSteps": [
      "Measure HbA1c at 8-12 weeks",
      "Annual screening for microvascular complications",
      "Assess cardiovascular risk at each visit"
    ],
    "sources": [
      {
        "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
        "url": "https://openalex.org/W2741809807",
        "why": "Provides comprehensive evidence on treatment efficacy"
      }
    ]
  }
}
```

---

## /API/FOLLOW-UP ENDPOINT OUTPUT

### Request
```json
POST /api/follow-up
{
  "sessionId": "507f1f77bcf86cd799439011",
  "question": "What are the side effects of GLP-1 agonists?"
}
```

### Response
```json
{
  "summary": {
    "summary": "GLP-1 agonists are generally well-tolerated. The most common side effects are gastrointestinal (nausea, vomiting). These typically diminish within weeks. Rare but serious side effects include pancreatitis and thyroid C-cell tumors.",
    "keyFindings": [
      "GI side effects occur in 30-40% of patients but are transient",
      "Cardiovascular safety is excellent; risk of MI/stroke reduced",
      "No increased cancer risk in humans despite animal data"
    ],
    "recommendations": [
      "Start at lowest dose and titrate slowly to minimize nausea",
      "Take with food if GI symptoms develop",
      "Screen for personal/family history of medullary thyroid cancer before initiation"
    ],
    "nextSteps": [
      "Monitor patient tolerance during titration phase",
      "Consider switching agent if side effects persist",
      "Educate patient that GI symptoms usually resolve in 2-4 weeks"
    ],
    "sources": [
      {
        "title": "Glycemic Control and Cardiovascular Outcomes in Type 2 Diabetes",
        "url": "https://openalex.org/W2741809807",
        "why": "Includes safety data on GLP-1 side effects"
      }
    ]
  }
}
```

---

## DEBUGGING: What to Check if Something Breaks

### "No results returned"
**Check:**
1. API endpoint is reachable: `curl https://api.openalex.org/works?search=test&per_page=1`
2. Query is not too specific (try "diabetes" not "Type 2 diabetes resistant to Metformin")
3. Check console for axios errors

### "Ranking algorithm returns wrong order"
**Check:**
1. Open MongoDB and inspect `Result` collection
2. Verify `_calculateScore()` is being called
3. Print scores to console: `console.log(result.title, result.score)`

### "LLM returns invalid JSON"
**Check:**
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Test LLM directly with simpler prompt
3. Check LLM response doesn't have markdown backticks (```json)
4. Increase `temperature` to 0.5 if too rigid

### "Frontend says 'Cannot reach backend'"
**Check:**
1. Backend is running: `npm start` shows no errors
2. CORS is enabled: `app.use(cors())` in server.js
3. Frontend is hitting correct URL: `http://localhost:5000/api`
4. No typos in endpoint paths

### "Results take >30 seconds"
**Check:**
1. You're making 3 API calls in parallel (Promise.all)
2. Not calling PubMed efetch for every UID (batch them)
3. Ollama is using a lightweight model (phi, not llama2)

---

## QUICK API TESTING WITH CURL

### Test Each API
```bash
# PubMed
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=cancer&retmax=1&rettype=json"

# OpenAlex
curl "https://api.openalex.org/works?search=cancer&per_page=1"

# ClinicalTrials
curl "https://clinicaltrials.gov/api/v2/studies?query.cond=cancer&pageSize=1"

# Your Backend
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"disease":"cancer","query":"treatment"}'
```

### Test LLM
```bash
# Ollama running?
curl http://localhost:11434/api/tags

# Can LLM respond?
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral","prompt":"Hello","stream":false}'
```

---

## EXPECTED PERFORMANCE METRICS

| Operation | Expected Time | Acceptable Range |
|-----------|---|---|
| PubMed search | 2-4s | <6s |
| OpenAlex search | 1-2s | <4s |
| ClinicalTrials search | 3-5s | <8s |
| All 3 in parallel | 4-6s | <10s |
| Ranking algorithm | <100ms | <500ms |
| LLM summary generation | 10-20s | <40s |
| **Full flow (search → summary)** | **15-30s** | **<45s** |

If LLM is slower, switch to phi model or reduce max_tokens in llm.js.

---

## JSON VALIDATION

### Expected Top Result Structure
```json
{
  "id": "string",
  "title": "string (required)",
  "source": "string (PubMed | OpenAlex | ClinicalTrials)",
  "pubDate": "YYYY-MM-DD or N/A",
  "url": "https://...",
  "score": "number (0-1)",
  "abstract": "string (optional for trials)",
  "citationCount": "number (optional)",
  "status": "string (optional for trials)"
}
```

### Expected Summary Structure
```json
{
  "summary": "string (2-3 sentences)",
  "keyFindings": ["string", "string"],
  "recommendations": ["string"],
  "nextSteps": ["string"],
  "sources": [
    {
      "title": "string",
      "url": "https://...",
      "why": "string"
    }
  ]
}
```

If your LLM is returning a different structure, update the prompt in llm.js.

---

## COMMON VALUES FOR TESTING

Use these in searches for reliable results:

**Diseases:**
- diabetes (lots of data)
- cancer (very mature dataset)
- hypertension (good trial data)
- depression (good mix of papers & trials)

**Queries:**
- "latest treatment"
- "clinical trials"
- "efficacy"
- "new medications"

These will always return results from all 3 sources.
