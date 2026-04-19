# DAY 1 & DAY 2 QUICK REFERENCE
## Hackathon Execution Checklist

---

## DAY 1: CORE INFRASTRUCTURE (4-5 hours)

### Hour 0-15 min: Setup
- [ ] `npm init -y` in backend folder
- [ ] `npm install express cors dotenv axios mongoose`
- [ ] Create `.env` file (copy from COPY_PASTE_CODE_KIT.md)
- [ ] Create folder structure (see main plan)

### Hour 0.5-1: Database Setup
- [ ] Start MongoDB locally: `mongod`
- [ ] Copy `config/database.js`
- [ ] Copy all model files from `/backend/models/`
- [ ] Test connection: Run `server.js`, check console for "MongoDB connected"

### Hour 1-2: API Clients
- [ ] Copy `services/pubmed.js`
- [ ] Test PubMed with curl:
  ```bash
  curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=diabetes&retmax=3&rettype=json"
  ```
- [ ] Copy `services/openAlex.js`
- [ ] Test OpenAlex:
  ```bash
  curl "https://api.openalex.org/works?search=diabetes&per_page=3"
  ```
- [ ] Copy `services/clinicalTrials.js`
- [ ] Test ClinicalTrials:
  ```bash
  curl "https://clinicaltrials.gov/api/v2/studies?query.cond=diabetes&pageSize=3"
  ```

### Hour 2-3: Basic Routes
- [ ] Copy `routes/search.js`
- [ ] Copy error middleware
- [ ] Copy `server.js`
- [ ] Test `/api/search` endpoint with Postman:
  ```json
  POST http://localhost:5000/api/search
  Body: {
    "disease": "diabetes",
    "query": "Type 2 treatment"
  }
  ```
- [ ] Verify you get raw results from all 3 sources

### Hour 3-4: Ranking + Simple Frontend
- [ ] Copy `services/ranking.js`
- [ ] Test ranking by calling `/api/search` again, verify top 8 results
- [ ] Create basic React app: `npx create-react-app frontend`
- [ ] Copy `components/SearchBar.jsx`
- [ ] Copy `components/ResultsList.jsx`
- [ ] Copy `App.jsx`
- [ ] Run frontend: `npm start` (in frontend folder)
- [ ] Test search from React UI

### Hour 4-5: Demo Readiness
- [ ] Fix any bugs in API calls
- [ ] Ensure MongoDB TTL is working (results auto-delete after 24h)
- [ ] Run full flow: Search → Get top 8 results → Display in UI
- [ ] **COMMIT: `git add . && git commit -m "Day 1: Core search + ranking"`**

### Day 1 Success = ✅
- ✅ Fetch from 3 sources (PubMed, OpenAlex, ClinicalTrials)
- ✅ Rank and return top 8
- ✅ Display in React UI
- ✅ No crashes on missing data

**If you only have 4 hours, STOP HERE.** You have a working research aggregator.

---

## DAY 2: LLM + CONTEXT (4-5 hours)

### Hour 0-1: Ollama Setup
- [ ] Install Ollama: https://ollama.ai
- [ ] Pull Mistral model: `ollama pull mistral` (or phi for faster)
- [ ] Start Ollama: `ollama serve`
- [ ] Verify it's running: `curl http://localhost:11434/api/tags`

### Hour 1-1.5: LLM Service
- [ ] Copy `services/llm.js`
- [ ] Test LLM with curl:
  ```bash
  curl -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{
      "model": "mistral",
      "prompt": "What is diabetes?",
      "stream": false
    }'
  ```
- [ ] Verify JSON parsing works (check if LLM output matches expected format)

### Hour 1.5-2.5: Context Management
- [ ] Copy `routes/conversation.js`
- [ ] Test `/api/generate-summary` endpoint:
  ```json
  POST http://localhost:5000/api/generate-summary
  Body: {
    "sessionId": "SESSION_ID_FROM_SEARCH",
    "topResults": [RESULTS_FROM_SEARCH]
  }
  ```
- [ ] Verify response is structured JSON
- [ ] Test `/api/follow-up`:
  ```json
  POST http://localhost:5000/api/follow-up
  Body: {
    "sessionId": "SESSION_ID",
    "question": "What are the side effects?"
  }
  ```

### Hour 2.5-3.5: Frontend Integration
- [ ] Create `components/SummaryPanel.jsx` (see template below)
- [ ] Update `App.jsx` to call `/api/generate-summary` after search
- [ ] Add follow-up input field
- [ ] Test full flow: Search → Get results → Generate summary → Ask follow-up

### Hour 3.5-4: Polish
- [ ] Add loading spinner
- [ ] Add error messages
- [ ] Test edge cases:
  - No results found
  - LLM timeout (set 60s timeout in llm.js)
  - Empty query
- [ ] Format summary display nicely
- [ ] **COMMIT: `git add . && git commit -m "Day 2: LLM + conversation"`**

### Hour 4-5: Demo + Optimizations
- [ ] Time the full flow (search → summary should be <30 seconds)
- [ ] Cache frequently asked questions
- [ ] Add "Download Results" button (JSON)
- [ ] Test on different queries
- [ ] Prepare demo script

### Day 2 Success = ✅
- ✅ LLM generates structured responses
- ✅ Follow-up questions work
- ✅ Conversation context maintained
- ✅ Full UI works end-to-end

---

## MINUTE-BY-MINUTE EXECUTION

### If You Have 4 Hours (Day 1 Only)
```
0:00-0:15   Setup + DB connection
0:15-0:45   API clients (all 3)
0:45-1:30   Routes + basic testing
1:30-2:30   Ranking algorithm
2:30-3:30   React SearchBar + ResultsList
3:30-4:00   Bug fixes + demo
```

### If You Have 8 Hours (Both Days)
```
DAY 1:
0:00-0:30   Setup + DB
0:30-1:30   All 3 API clients
1:30-2:30   Routes + ranking
2:30-3:30   Frontend basic
3:30-4:00   Bug fixes

DAY 2:
4:00-4:30   Ollama + LLM service
4:30-5:30   Context management routes
5:30-6:30   Frontend summary panel
6:30-7:30   Follow-ups + polish
7:30-8:00   Demo + optimization
```

---

## SummaryPanel Component (For Day 2)

```javascript
// frontend/src/components/SummaryPanel.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function SummaryPanel({ sessionId, topResults }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [followUp, setFollowUp] = useState('');

  const handleGenerateSummary = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:5000/api/generate-summary', {
        sessionId,
        topResults,
      });
      setSummary(data.summary);
    } catch (error) {
      console.error('Summary Error:', error);
      alert('Failed to generate summary. Check backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUp.trim()) return;
    setLoading(true);

    try {
      const { data } = await axios.post('http://localhost:5000/api/follow-up', {
        sessionId,
        question: followUp,
      });
      setSummary(data.summary);
      setFollowUp('');
    } catch (error) {
      console.error('Follow-up Error:', error);
      alert('Follow-up failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#e8f4f8', borderTop: '2px solid #007bff' }}>
      <h3>AI Analysis</h3>

      {!summary ? (
        <button
          onClick={handleGenerateSummary}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {loading ? 'Generating...' : 'Generate AI Summary'}
        </button>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h4>Summary</h4>
            <p>{summary.summary}</p>

            {summary.keyFindings?.length > 0 && (
              <>
                <h5>Key Findings:</h5>
                <ul>
                  {summary.keyFindings.map((finding, idx) => (
                    <li key={idx}>{finding}</li>
                  ))}
                </ul>
              </>
            )}

            {summary.recommendations?.length > 0 && (
              <>
                <h5>Recommendations:</h5>
                <ul>
                  {summary.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div>
            <h4>Ask a Follow-up Question</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="What else do you want to know?"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleFollowUp()}
                style={{ flex: 1, padding: '8px' }}
              />
              <button
                onClick={handleFollowUp}
                disabled={loading || !followUp.trim()}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Thinking...' : 'Ask'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## CRITICAL GOTCHAS (Fix These ASAP If They Happen)

### ❌ "Cannot find module 'mongoose'"
**Fix:** `npm install mongoose`

### ❌ PubMed returns empty results
**Fix:** Query might have special characters. Use encodeURIComponent() or test with simple queries first.

### ❌ OpenAlex takes 10+ seconds
**Fix:** It's normal. Don't over-optimize. Increase timeout to 30s.

### ❌ ClinicalTrials returns 0 results
**Fix:** Their API is fussy. Try simplifying the condition name or removing filters.

### ❌ LLM returns invalid JSON
**Fix:** Your prompt is wrong. Copy exact prompt from llm.js. Tell LLM "Respond ONLY in JSON, no other text."

### ❌ Frontend can't reach backend
**Fix:** Backend not running or CORS not enabled. Check: `app.use(cors())` is in server.js

### ❌ Ollama timeout error
**Fix:** Mistral model is slow on small machines. Use `ollama pull phi` instead (much faster, smaller).

### ❌ "Cannot GET /api/search"
**Fix:** Did you add routes to server.js? Check: `app.use('/api', require('./routes/search'));`

---

## TESTING CHECKLIST

### Before Day 1 Ends
- [ ] Backend runs without errors: `npm start` shows no errors
- [ ] Each API client works independently (test with curl)
- [ ] `/api/search` returns results in <10 seconds
- [ ] Results are properly ranked (top 8, sorted by score)
- [ ] React frontend loads and displays results
- [ ] No crashes when result is missing a field

### Before Day 2 Ends
- [ ] Ollama is running: `curl http://localhost:11434/api/tags`
- [ ] LLM responds to prompts in <30 seconds
- [ ] `/api/generate-summary` returns valid JSON
- [ ] Follow-up questions work
- [ ] Conversation history is maintained in MongoDB
- [ ] Full UI flow works end-to-end

---

## DEMO SCRIPT (For Judges)

```
"Let me show you the Medical Research Assistant.

[Go to frontend, search bar]
"I'll search for 'Type 2 diabetes' and ask 'What are the latest treatment options?'"

[Type disease and query, click Search]
"The system is fetching papers from PubMed, clinical trials from ClinicalTrials.gov, 
and academic papers from OpenAlex. [Results load in 8-10 seconds]

These are the top 8 results, ranked by relevance, recency, and credibility. 
[Point to scores]

Now I'll generate an AI summary of these findings."

[Click "Generate AI Summary", wait 15-20 seconds]
"The LLM read all the papers and synthesized the findings into key insights, 
recommendations, and next steps.

Let me ask a follow-up question: 'What are the side effects?'"

[Type follow-up, submit]
"The system remembers the previous context and gives a follow-up answer based 
on the same research papers."

Done. The whole system works end-to-end."
```

---

## SUCCESS METRICS

### Minimum to Pass
- [ ] Search works (returns results)
- [ ] Results are ranked
- [ ] React frontend displays results
- [ ] No crashes

### Good to Have
- [ ] LLM generates summaries
- [ ] Follow-up questions work
- [ ] Results are from 3 different sources
- [ ] Clean UI

### Excellent
- [ ] Fast (<15 seconds for full flow)
- [ ] Accurate LLM responses
- [ ] Session context preserved
- [ ] Polished design
- [ ] Error handling for edge cases

---

## FINAL TIPS

1. **Don't perfect, just ship.** Hackers ship first, polish later.
2. **If LLM is slow, use phi instead of mistral:** `ollama pull phi` (3x faster)
3. **If stuck on API, return dummy data** and keep building. You can fix it later.
4. **Test with 3 different queries** to catch edge cases.
5. **Keep backend logs visible** while testing frontend.
6. **Commit after each major milestone.** You might need to revert.
7. **If time runs out, just demo Day 1.** A working aggregator is impressive.

You got this. Ship it.
