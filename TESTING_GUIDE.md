# Quick Start: Testing AI Chat

## Start Both Servers

**Terminal 1 - Backend:**
```bash
cd /Users/ahmadd/Downloads/nexile-intellifin
export PATH="$PWD/local-node/bin:$PATH"
npm run server
```

**Terminal 2 - Frontend:** 
```bash
cd /Users/ahmadd/Downloads/nexile-intellifin
export PATH="$PWD/local-node/bin:$PATH"
npm run dev
```

## Test the AI Chat

1. Open http://localhost:3000 in your browser
2. Navigate to the AI Chat section
3. Try these test prompts:
   - "Which project was most profitable?"
   - "Analyze our expense trends this month"
   - "What's our projected cash flow?"

## Watch the Logs

### Backend Console Should Show:
```
🚀 Nexile AI Backend Server running on http://localhost:3001
📊 Environment: development
🔐 API Keys loaded: ✓
[AI Chat] Processing query: "Which project was most profitable?"
[AI Request] Attempt 1/3 using token index 0
[AI Request] ✓ Success with token index 0
[AI Chat] ✓ Response generated successfully
```

### Frontend Console Should Show:
```
[AI Chat] Sending request to backend...
[AI Client] Calling backend: http://localhost:3001/api/ai/chat
[AI Client] ✓ Backend response received
[AI Chat] ✓ Response received from backend
```

## Verify Security

1. Open Browser DevTools → Network tab
2. Send a message in AI chat
3. Check the request: Should go to `localhost:3001/api/ai/chat` (NOT Azure)
4. Check Sources tab: Search for "github_pat" - should find ZERO results ✅

## Quick Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-01-27T..."}
```
