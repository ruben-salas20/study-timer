#!/bin/bash
# End-to-end backend test for Study Timer.
# Creates 2 test users, exercises friends + challenges + sessions, asserts each step.
# Usage: bash e2e-backend-test.sh
# Side-effect: leaves test users in DB. Caller deletes via DB.
set -uo pipefail

API="https://timer.rubensalas.dev/api"

# Color helpers
GREEN="\033[32m"; RED="\033[31m"; YELLOW="\033[33m"; RESET="\033[0m"
ok() { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; FAILS=$((FAILS+1)); }
info() { echo -e "${YELLOW}→${RESET} $1"; }
FAILS=0

# Helper: extract JSON value (no jq dependency)
json_get() { echo "$1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('$2', ''))" 2>/dev/null; }
json_nested() { echo "$1" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d$2)" 2>/dev/null; }

#───────────────────────────────────────────────────────────────────────────
echo "=== 1. Register two test users ==="
#───────────────────────────────────────────────────────────────────────────

EMAIL_A="e2e-alice-$(date +%s)@test.local"
EMAIL_B="e2e-bob-$(date +%s)@test.local"
PASS="TestPass1234"

REG_A=$(curl -s -X POST "$API/collections/users/records" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"$PASS\",\"passwordConfirm\":\"$PASS\",\"displayName\":\"Alice\"}")
USER_A_ID=$(json_get "$REG_A" id)
USER_A_CODE=$(json_get "$REG_A" friendCode)
[[ -n "$USER_A_ID" ]] && ok "Alice registered: $EMAIL_A id=$USER_A_ID code=$USER_A_CODE" || { fail "Alice registration: $REG_A"; exit 1; }
[[ -n "$USER_A_CODE" && ${#USER_A_CODE} -eq 6 ]] || fail "Alice friendCode invalid (expected 6 chars, got '$USER_A_CODE')"

REG_B=$(curl -s -X POST "$API/collections/users/records" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PASS\",\"passwordConfirm\":\"$PASS\",\"displayName\":\"Bob\"}")
USER_B_ID=$(json_get "$REG_B" id)
USER_B_CODE=$(json_get "$REG_B" friendCode)
[[ -n "$USER_B_ID" ]] && ok "Bob registered: $EMAIL_B id=$USER_B_ID code=$USER_B_CODE" || { fail "Bob registration: $REG_B"; exit 1; }

#───────────────────────────────────────────────────────────────────────────
echo "=== 2. Login both users ==="
#───────────────────────────────────────────────────────────────────────────

AUTH_A=$(curl -s -X POST "$API/collections/users/auth-with-password" -H "Content-Type: application/json" \
  -d "{\"identity\":\"$EMAIL_A\",\"password\":\"$PASS\"}")
TOKEN_A=$(json_get "$AUTH_A" token)
[[ -n "$TOKEN_A" ]] && ok "Alice login OK" || { fail "Alice login: $AUTH_A"; exit 1; }

AUTH_B=$(curl -s -X POST "$API/collections/users/auth-with-password" -H "Content-Type: application/json" \
  -d "{\"identity\":\"$EMAIL_B\",\"password\":\"$PASS\"}")
TOKEN_B=$(json_get "$AUTH_B" token)
[[ -n "$TOKEN_B" ]] && ok "Bob login OK" || { fail "Bob login: $AUTH_B"; exit 1; }

#───────────────────────────────────────────────────────────────────────────
echo "=== 3. Alice searches Bob by friendCode ==="
#───────────────────────────────────────────────────────────────────────────

SEARCH=$(curl -s "$API/collections/users/records?filter=friendCode%3D%22$USER_B_CODE%22" \
  -H "Authorization: Bearer $TOKEN_A")
SEARCH_FOUND=$(echo "$SEARCH" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
[[ "$SEARCH_FOUND" == "1" ]] && ok "Alice can find Bob by code" || fail "Search by code returned $SEARCH_FOUND items: $SEARCH"

#───────────────────────────────────────────────────────────────────────────
echo "=== 4. Alice creates friendship to Bob ==="
#───────────────────────────────────────────────────────────────────────────

FRIENDSHIP=$(curl -s -X POST "$API/collections/friendships/records" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"userA\":\"$USER_A_ID\",\"userB\":\"$USER_B_ID\",\"status\":\"pending\",\"requestedBy\":\"$USER_A_ID\"}")
FRIENDSHIP_ID=$(json_get "$FRIENDSHIP" id)
[[ -n "$FRIENDSHIP_ID" ]] && ok "Friendship created: id=$FRIENDSHIP_ID" || { fail "Friendship create: $FRIENDSHIP"; }

#───────────────────────────────────────────────────────────────────────────
echo "=== 5. Bob lists incoming pending requests ==="
#───────────────────────────────────────────────────────────────────────────

if [[ -n "$FRIENDSHIP_ID" ]]; then
  PENDING=$(curl -s "$API/collections/friendships/records?filter=status%3D%22pending%22%20%26%26%20requestedBy!%3D%22$USER_B_ID%22%20%26%26%20(userA%3D%22$USER_B_ID%22%20%7C%7C%20userB%3D%22$USER_B_ID%22)" \
    -H "Authorization: Bearer $TOKEN_B")
  PENDING_COUNT=$(echo "$PENDING" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
  [[ "$PENDING_COUNT" == "1" ]] && ok "Bob sees Alice's pending request" || fail "Bob's pending count: $PENDING_COUNT - response: $PENDING"

  echo "=== 6. Bob accepts ==="
  ACCEPT=$(curl -s -X PATCH "$API/collections/friendships/records/$FRIENDSHIP_ID" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" \
    -d "{\"status\":\"accepted\"}")
  STATUS=$(json_get "$ACCEPT" status)
  [[ "$STATUS" == "accepted" ]] && ok "Friendship accepted" || fail "Accept: $ACCEPT"
fi

#───────────────────────────────────────────────────────────────────────────
echo "=== 7. Alice creates a study_session (stopwatch) and ends it ==="
#───────────────────────────────────────────────────────────────────────────

SESSION=$(curl -s -X POST "$API/collections/study_sessions/records" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"user\":\"$USER_A_ID\",\"mode\":\"stopwatch\",\"startedAt\":\"2026-05-07T22:00:00.000Z\",\"durationSec\":0}")
SESSION_ID=$(json_get "$SESSION" id)
[[ -n "$SESSION_ID" ]] && ok "Session created: $SESSION_ID" || { fail "Session create: $SESSION"; }

if [[ -n "$SESSION_ID" ]]; then
  END=$(curl -s -X PATCH "$API/collections/study_sessions/records/$SESSION_ID" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
    -d "{\"endedAt\":\"2026-05-07T22:01:00.000Z\",\"durationSec\":60}")
  END_DUR=$(json_get "$END" durationSec)
  [[ "$END_DUR" == "60" ]] && ok "Session ended with 60s" || fail "Session end: $END"
fi

#───────────────────────────────────────────────────────────────────────────
echo "=== 8. Alice creates a challenge (race) inviting Bob ==="
#───────────────────────────────────────────────────────────────────────────

CHALLENGE=$(curl -s -X POST "$API/collections/challenges/records" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
  -d "{\"createdBy\":\"$USER_A_ID\",\"type\":\"race\",\"title\":\"Test Race\",\"startsAt\":\"2026-05-07T20:00:00.000Z\",\"endsAt\":\"2026-05-14T20:00:00.000Z\",\"targetSec\":3600,\"prizeWinner\":\"Cafe\",\"status\":\"pending\"}")
CHALLENGE_ID=$(json_get "$CHALLENGE" id)
[[ -n "$CHALLENGE_ID" ]] && ok "Challenge created: $CHALLENGE_ID" || { fail "Challenge create: $CHALLENGE"; }

# Alice (creator) invites Bob as participant — this is what the frontend createChallenge does
if [[ -n "$CHALLENGE_ID" ]]; then
  echo "=== 9a. Alice (creator) invites Bob to her challenge ==="
  PARTICIPANT_INVITE=$(curl -s -X POST "$API/collections/challenge_participants/records" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" \
    -d "{\"challenge\":\"$CHALLENGE_ID\",\"user\":\"$USER_B_ID\",\"joinedAt\":\"2026-05-07T22:30:00.000Z\",\"progressSec\":0,\"streakDays\":0}")
  PI_ID=$(json_get "$PARTICIPANT_INVITE" id)
  [[ -n "$PI_ID" ]] && ok "Alice can invite Bob (frontend create flow)" || fail "Alice invites Bob: $PARTICIPANT_INVITE"

  echo "=== 9b. Bob can also self-join (alt path) ==="
  PARTICIPANT_B=$(curl -s -X POST "$API/collections/challenge_participants/records" \
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" \
    -d "{\"challenge\":\"$CHALLENGE_ID\",\"user\":\"$USER_B_ID\",\"joinedAt\":\"2026-05-07T22:31:00.000Z\",\"progressSec\":0,\"streakDays\":0}")
  PB_ID=$(json_get "$PARTICIPANT_B" id)
  [[ -n "$PB_ID" || -n "$PI_ID" ]] && ok "Bob can self-join (or already invited)" || fail "Bob self-join: $PARTICIPANT_B"

  echo "=== 10. Alice lists her challenges ==="
  ALICE_CHALLENGES=$(curl -s "$API/collections/challenges/records" -H "Authorization: Bearer $TOKEN_A")
  AC_COUNT=$(echo "$ALICE_CHALLENGES" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
  [[ "$AC_COUNT" -ge 1 ]] && ok "Alice sees $AC_COUNT challenges" || fail "Alice challenges: $ALICE_CHALLENGES"

  echo "=== 11. Bob lists his challenges ==="
  BOB_CHALLENGES=$(curl -s "$API/collections/challenges/records" -H "Authorization: Bearer $TOKEN_B")
  BC_COUNT=$(echo "$BOB_CHALLENGES" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
  [[ "$BC_COUNT" -ge 1 ]] && ok "Bob sees $BC_COUNT challenges (joined ones)" || fail "Bob challenges: $BOB_CHALLENGES (count=$BC_COUNT)"
fi

#───────────────────────────────────────────────────────────────────────────
echo "=== 12. Alice can read her own + friends' sessions ==="
#───────────────────────────────────────────────────────────────────────────

ALICE_SESSIONS=$(curl -s "$API/collections/study_sessions/records?filter=user%3D%22$USER_A_ID%22" \
  -H "Authorization: Bearer $TOKEN_A")
AS_COUNT=$(echo "$ALICE_SESSIONS" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
[[ "$AS_COUNT" -ge 1 ]] && ok "Alice sees $AS_COUNT of her sessions" || fail "Alice sessions: $ALICE_SESSIONS"

# Bob tries to read Alice's sessions (should work since they're friends)
BOB_SEES_ALICE=$(curl -s "$API/collections/study_sessions/records?filter=user%3D%22$USER_A_ID%22" \
  -H "Authorization: Bearer $TOKEN_B")
BSA_COUNT=$(echo "$BOB_SEES_ALICE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))")
[[ "$BSA_COUNT" -ge 1 ]] && ok "Bob (friend) can read Alice's sessions: $BSA_COUNT" || fail "Bob seeing Alice's sessions: $BOB_SEES_ALICE (count=$BSA_COUNT)"

#───────────────────────────────────────────────────────────────────────────
echo ""
if [[ $FAILS -eq 0 ]]; then
  echo -e "${GREEN}=== ALL E2E TESTS PASSED ===${RESET}"
else
  echo -e "${RED}=== $FAILS FAILURES ===${RESET}"
fi
echo ""
echo "Test users created (for cleanup):"
echo "  Alice: $EMAIL_A (id=$USER_A_ID)"
echo "  Bob:   $EMAIL_B (id=$USER_B_ID)"
