#!/bin/bash
TOKEN="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"
REPO="willkinkurniadi-source/coffee-beans-ai-agent"
BASE_URL="https://api.github.com/repos/$REPO/contents"
BASE_LOCAL="$HOME/Documents/Codex/2026-05-30/buat-ai-agent-yang-bisa-mulai/outputs/coffee-agent-app"
LOG="$BASE_LOCAL/push_results.log"

echo "Starting GitHub push at $(date)" > "$LOG"

push_file() {
  local remote_path="$1"
  local local_path="$2"
  
  if [ ! -f "$local_path" ]; then
    echo "SKIP (not found): $remote_path" | tee -a "$LOG"
    return
  fi
  
  SHA=$(curl -s -H "Authorization: token $TOKEN" "$BASE_URL/$remote_path" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null)
  
  CONTENT=$(base64 < "$local_path" | tr -d '\n')
  
  COMMIT_MSG="feat: brand guidelines + content agent rewrite + UI redesign + Railway deploy"
  PAYLOAD="{\"message\":\"$COMMIT_MSG\",\"content\":\"$CONTENT\""
  if [ -n "$SHA" ]; then
    PAYLOAD="$PAYLOAD,\"sha\":\"$SHA\""
  fi
  PAYLOAD="$PAYLOAD}"
  
  RESULT=$(curl -s -X PUT \
    -H "Authorization: token $TOKEN" \
    -H "Content-Type: application/json" \
    "$BASE_URL/$remote_path" \
    -d "$PAYLOAD" \
    | python3 -c "import json,sys; d=json.load(sys.stdin); print('OK' if d.get('commit') else d.get('message','error'))")
  
  echo "$remote_path: $RESULT" | tee -a "$LOG"
}

push_file "src/agents/contentAgent.js"         "$BASE_LOCAL/src/agents/contentAgent.js"
push_file "src/connectors/openaiDesignClient.js" "$BASE_LOCAL/src/connectors/openaiDesignClient.js"
push_file "src/services/contentService.js"     "$BASE_LOCAL/src/services/contentService.js"
push_file "src/services/dailyWorkflow.js"      "$BASE_LOCAL/src/services/dailyWorkflow.js"
push_file "public/app.js"                      "$BASE_LOCAL/public/app.js"
push_file "public/index.html"                  "$BASE_LOCAL/public/index.html"
push_file "public/styles.css"                  "$BASE_LOCAL/public/styles.css"
push_file "src/connectors/publishingClient.js" "$BASE_LOCAL/src/connectors/publishingClient.js"
push_file "src/server.js"                      "$BASE_LOCAL/src/server.js"
push_file "railway.json"                       "$BASE_LOCAL/railway.json"
push_file "docs/BRAND_GUIDELINES.md"           "$BASE_LOCAL/docs/BRAND_GUIDELINES.md"

echo "Done at $(date)" >> "$LOG"
echo ""
echo "=== All done. Results saved to $LOG ==="
