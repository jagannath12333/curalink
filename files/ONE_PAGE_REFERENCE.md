# ONE-PAGE VISUAL REFERENCE
## Print this. Pin it. Follow it.

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND                          │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │  SearchBar   │→ │ ResultsList   │→ │ SummaryPanel     │ │
│  │ (Disease +   │  │ (Top 8        │  │ (LLM Response)   │ │
│  │  Query)      │  │  Results)     │  │ + Follow-ups     │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ axios.post()
        ┌─────────────────────┐
        │  EXPRESS BACKEND    │
        │  (Node.js)          │
        └─────────────────────┘
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    ┌──────┐ ┌────────┐ ┌───────────┐
    │PubMed│ │OpenAlex│ │ClinicalTr.│
    └──────┘ └────────┘ └───────────┘
        │         │          │
        └─────────┼──────────┘
                  ↓
        ┌──────────────────┐
        │  Ranking.js      │
        │  (Score & Sort)  │
        └────────┬─────────┘
                 ↓
        ┌──────────────────┐
        │  MongoDB         │
        │  (Cache Results) │
        └──────────────────┘
                 │
        [Top 8 Results] → LLM (Ollama)
                 │
                 ↓
        Structured JSON Response
```

---

## DATA FLOW CHECKLIST

```
1. USER INPUT
   Disease: "diabetes"
   Query: "Type 2 treatment"
                ↓
2. SEARCH ENDPOINT (/api/search)
   ✓ Create session
   ✓ Search PubMed (50 results)
   ✓ Search OpenAlex (50 results)
   ✓ Search ClinicalTrials (50 results)
   ✓ Combine (150 results)
                ↓
3. RANKING ENDPOINT
   ✓ Calculate relevance score (40%)
   ✓ Calculate recency score (30%)
   ✓ Calculate credibility score (30%)
   ✓ Sort by total score
   ✓ Return top 8
                ↓
4. REACT DISPLAYS
   ✓ Show 8 results with scores
   ✓ Show source, date, URL
   ✓ User clicks "Generate Summary"
                ↓
5. LLM ENDPOINT (/api/generate-summary)
   ✓ Receive top 8 results
   ✓ Build prompt with results
   ✓ Call Ollama API
   ✓ Parse JSON response
   ✓ Return structured summary
                ↓
6. FOLLOW-UP (/api/follow-up)
   ✓ Receive follow-up question
   ✓ Pass full conversation history to LLM
   ✓ LLM answers using same papers
   ✓ Store new exchange in session
                ↓
7. DONE
   User has AI-powered insights with full context.
```

---

## 4-HOUR TIMELINE (Print & Check)

```
T+0:00 ━━━━━━━━━━ SETUP & DB
       ├─ npm init & install
       ├─ Create .env
       ├─ mongod running?
       └─ database.js + models created
              ↓ VERIFY: npm start (no errors)

T+0:30 ━━━━━━━━━━ API CLIENTS
       ├─ pubmed.js copy + test with curl
       ├─ openAlex.js copy + test with curl
       ├─ clinicalTrials.js copy + test with curl
       └─ All 3 return results?
              ↓ VERIFY: Each returns data

T+1:30 ━━━━━━━━━━ ROUTES + RANKING
       ├─ routes/search.js
       ├─ services/ranking.js
       ├─ server.js complete
       └─ /api/search endpoint working?
              ↓ VERIFY: curl http://localhost:5000/api/search returns 8 results

T+2:30 ━━━━━━━━━━ REACT UI
       ├─ npx create-react-app frontend
       ├─ SearchBar component
       ├─ ResultsList component
       ├─ App.jsx calling /api/search
       └─ Results display on screen?
              ↓ VERIFY: Search → Results appear

T+3:30 ━━━━━━━━━━ BUG FIXES
       ├─ Test with different queries
       ├─ Handle missing data gracefully
       ├─ Remove console errors
       └─ Demo script ready
              ↓ VERIFY: No crashes, clean demo

T+4:00 ━━━━━━━━━━ SHIP & CELEBRATE
       ✓ git commit "Day 1: Working search & ranking"
       ✓ Have demo ready for judges
       ✓ You have a working product
```

---

## 8-HOUR TIMELINE (Add Day 2)

```
[4:00 hours as above]

T+4:00 ━━━━━━━━━━ OLLAMA SETUP
       ├─ Install Ollama
       ├─ ollama pull mistral
       ├─ ollama serve (terminal open)
       └─ curl localhost:11434/api/tags works?
              ↓ VERIFY: Ollama responding

T+4:30 ━━━━━━━━━━ LLM SERVICE
       ├─ services/llm.js copied
       ├─ Prompt template correct?
       ├─ JSON parsing working?
       └─ Returns structured response?
              ↓ VERIFY: /api/generate-summary returns JSON

T+5:30 ━━━━━━━━━━ CONTEXT MANAGEMENT
       ├─ routes/conversation.js
       ├─ Session storage in MongoDB
       ├─ /api/follow-up endpoint
       └─ Follow-ups work with context?
              ↓ VERIFY: Follow-ups reference previous results

T+6:30 ━━━━━━━━━━ FRONTEND INTEGRATION
       ├─ SummaryPanel component
       ├─ Follow-up input UI
       ├─ Loading states
       └─ Full flow works?
              ↓ VERIFY: Search → Summary → Follow-up → Answer

T+7:30 ━━━━━━━━━━ POLISH & TEST
       ├─ Error messages show
       ├─ Loading spinners work
       ├─ Test 3+ different queries
       ├─ Edge cases handled
       └─ Performance OK (<30 sec)?
              ↓ VERIFY: Smooth end-to-end experience

T+8:00 ━━━━━━━━━━ SHIP
       ✓ git commit "Day 2: LLM + conversation"
       ✓ Demo script memorized
       ✓ Ready for judges
```

---

## GIT COMMITS (Copy-Paste These)

```bash
# Day 1, after setup
git add .
git commit -m "Initial: Node + Express + MongoDB setup"

# Day 1, after APIs
git add .
git commit -m "Feat: PubMed, OpenAlex, ClinicalTrials API clients"

# Day 1, after ranking
git add .
git commit -m "Feat: Ranking algorithm + /api/search endpoint"

# Day 1, after React
git add .
git commit -m "Feat: React SearchBar + ResultsList UI"

# Day 1, end
git add .
git commit -m "Day 1 complete: Working research aggregator"

# Day 2, after LLM
git add .
git commit -m "Feat: LLM integration + /api/generate-summary"

# Day 2, after context
git add .
git commit -m "Feat: Session context + /api/follow-up endpoint"

# Day 2, after UI
git add .
git commit -m "Feat: SummaryPanel + follow-up UI"

# Day 2, end
git add .
git commit -m "Day 2 complete: Full medical research assistant"
```

---

## FILE CHECKLIST (Mark as You Create)

**BACKEND**
- [ ] .env (copy from guide)
- [ ] server.js (copy from guide)
- [ ] config/database.js (copy from guide)
- [ ] models/Query.js (copy from guide)
- [ ] models/Result.js (copy from guide)
- [ ] models/Session.js (copy from guide)
- [ ] services/pubmed.js (copy from guide)
- [ ] services/openAlex.js (copy from guide)
- [ ] services/clinicalTrials.js (copy from guide)
- [ ] services/ranking.js (copy from guide)
- [ ] services/llm.js (copy from guide - Day 2)
- [ ] routes/search.js (copy from guide)
- [ ] routes/conversation.js (copy from guide - Day 2)
- [ ] middleware/errorHandler.js (copy from guide)
- [ ] package.json (copy from guide)

**FRONTEND**
- [ ] components/SearchBar.jsx (copy from guide)
- [ ] components/ResultsList.jsx (copy from guide)
- [ ] components/SummaryPanel.jsx (copy from guide - Day 2)
- [ ] App.jsx (copy from guide)
- [ ] package.json (generated by create-react-app)

---

## QUICK DEBUG TREE

```
PROBLEM
  ├─ Backend won't start
  │  ├─ npm install done?
  │  ├─ .env file exists?
  │  ├─ MongoDB running?
  │  └─ → Check EMERGENCY_FALLBACK.md
  │
  ├─ APIs return nothing
  │  ├─ API endpoints reachable? (curl test)
  │  ├─ Query spelled right?
  │  ├─ Rate limited?
  │  └─ → Check API_RESPONSES_REFERENCE.md
  │
  ├─ Frontend can't reach backend
  │  ├─ Backend running?
  │  ├─ CORS enabled?
  │  ├─ URL correct? (http://localhost:5000)
  │  └─ → Check server.js line 1 (cors)
  │
  ├─ LLM times out
  │  ├─ Ollama running?
  │  ├─ Model downloaded? (ollama pull)
  │  ├─ Try phi instead of mistral
  │  └─ → Check EMERGENCY_FALLBACK.md #1
  │
  └─ Results look wrong
     ├─ Check ranking scores (console.log them)
     ├─ Verify APIs return data
     ├─ Test with simple query ("cancer")
     └─ → Check API_RESPONSES_REFERENCE.md
```

---

## SUCCESS METRICS

```
MINIMUM (4-hour build)
  ✓ Search returns results (from any source)
  ✓ Results displayed in React
  ✓ No crashes

GOOD (8-hour build)
  ✓ All 3 sources working
  ✓ Proper ranking
  ✓ Clean UI
  ✓ Fast (<10 sec search)

EXCELLENT (Full build + polish)
  ✓ LLM summaries
  ✓ Follow-up questions
  ✓ Context maintained
  ✓ Fast (<30 sec end-to-end)
  ✓ Beautiful UI
  ✓ Error handling
  ✓ Judges impressed
```

---

## COPY-PASTE COMMANDS

```bash
# Setup
mkdir medical-research-assistant && cd medical-research-assistant
mkdir -p backend/{config,models,services,routes,middleware}
mkdir -p frontend/src/{components,pages,services}

# Backend
cd backend
npm init -y
npm install express cors dotenv axios mongoose

# Frontend
cd ../frontend
npx create-react-app .
npm install axios

# Testing
# Terminal 1:
cd backend
npm start

# Terminal 2:
cd frontend
npm start

# Terminal 3:
mongod

# Terminal 4:
ollama serve
```

---

## MOCK SEARCH RESULT (For Testing)

Paste this in `/api/search` to test without real APIs:

```json
{
  "sessionId": "507f1f77bcf86cd799439011",
  "resultCount": 3,
  "topResults": [
    {
      "id": "1",
      "title": "SGLT2 Inhibitors Show Promise in Type 2 Diabetes",
      "source": "PubMed",
      "pubDate": "2024-01-15",
      "url": "https://pubmed.ncbi.nlm.nih.gov/12345/",
      "score": "0.87"
    },
    {
      "id": "2",
      "title": "GLP-1 Receptor Agonists Improve Cardiovascular Outcomes",
      "source": "OpenAlex",
      "pubDate": "2023-06-20",
      "url": "https://openalex.org/W123456/",
      "score": "0.82"
    },
    {
      "id": "3",
      "title": "Phase 3 Trial: Combination Therapy in Type 2 Diabetes",
      "source": "ClinicalTrials",
      "pubDate": "2023-01-15",
      "url": "https://clinicaltrials.gov/ct2/show/NCT123456/",
      "score": "0.75"
    }
  ]
}
```

---

## JUDGES' IMPRESSION CHECKLIST

```
They'll check:
  ✓ System runs without crashing (30%)
  ✓ Returns results from multiple sources (25%)
  ✓ Ranking makes sense (20%)
  ✓ UI is clean & usable (15%)
  ✓ LLM adds value (10%)

You need ~70% to win.
```

---

## FINAL CHECKLIST

Before showing judges:
- [ ] Backend running (`npm start` shows no errors)
- [ ] Frontend running (`npm start` shows "compiled successfully")
- [ ] Do a test search
- [ ] Results appear (within 10 seconds)
- [ ] No console errors (open dev tools)
- [ ] Try a follow-up (if Day 2)
- [ ] Verify URLs work (click one)
- [ ] Demo script memorized

You're ready. Go win.
