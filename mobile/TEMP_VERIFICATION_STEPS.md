# Two-Phone Demo Verification Plan (Realistic Scenario)

## Setup

### 1) Database State
Database is cleaned and seeded with realistic demo data:
- **Phone 1 (Mentee):** Mert Aydin - looking for mentorship on React Native & System Design
- **Phone 2 (Mentor):** Can Ozkan - Engineering Mentor specializing in Docker, GraphQL, System Design
- **Backup Mentors:** Lena Schmidt, Elif Kaya, Metin Yildiz
- **Registration Slot:** Secondary mentee is intentionally omitted so you can test fresh sign-up
- **Scenario:** Multiple mentors visible in Discover, some with availability slots, various request states

### 2) Demo Credentials

**Phone 1 - Mentee Account:**
```
email:    mert.aydin@example.com
password: mert-aydin-2026!
```

**Phone 2 - Mentor Account (Can Özkan):**
```
email:    can.ozkan@example.com
password: can-ozkan-2026!
```

**New Registration Test Account:**
- Create a fresh mentee account from the register screen after reseed.
- Use an email not already in the demo seed.
- Password only needs to be at least 8 characters and must match confirmation.

**Backup Mentor (if testing multiple requests):**
```
email:    lena.schmidt@example.com
password: lena-schmidt-2026!
```

### 3) Start Mobile App

From workspace root:
```bash
cd mobile && npm start -- --clear
```

Open Expo on two simulators/devices (iPhone simulators recommended on macOS).

---

## Two-Phone Flow Testing

### Phase 1: Login & Dashboard Check

**Phone 1 (Seeded Mentee):**
1. Launch app → tap "Log In"
2. Enter: `mert.aydin@example.com` / `mert-aydin-2026!`
3. ✓ Should land on **Dashboard** (Home tab)
4. Expected: "Your Requests" section visible (may be empty or show pending requests from seed)

**Phone 2 (Mentor):**
1. Launch app → tap "Log In"
2. Enter: `can.ozkan@example.com` / `can-ozkan-2026!`
3. ✓ Should land on **Dashboard** (Home tab)
4. Expected: Profile data showing "Can Özkan" with mentor role badge near name

### Phase 1B: Fresh Register Check

**Phone 1 or a clean simulator session:**
1. Open the Register screen.
2. Create a new mentee account with a unique email.
3. Use an 8+ character password and matching confirmation.
4. Pick at least one skill and accept the terms.
5. ✓ Should land in the app with usage mode set and a populated profile shell.
6. Log out and log back in with the new credentials to confirm persistence.

---

### Phase 2: Discover & Request

**Phone 1 (Mentee):**
1. Tap **Discover** tab (magnifying glass)
2. Browse list of mentors → find **"Can Özkan"**
3. Tap on Can Özkan's profile card
4. Expected: Profile page loads with:
   - Profile name, title, bio, skills
   - **Role badge** (shows "Mentor") near name
   - Availability slots (inline, NOT modal)
   - Day buttons (expandable)
5. Select an available time slot
6. Slot color changes to indicate selection
7. **Request a Session** form appears below availability
8. Fill: cover letter textarea (e.g., "I'd like help with system design")
9. Tap **Send Request**
10. ✓ Expected: Toast/alert confirming request sent, form clears

**Validation on Phone 1 Dashboard:**
1. Return to **Home** tab
2. Under "Your Requests" section
3. ✓ Should see new request to "Can Özkan" with status **"Pending"**

---

### Phase 3: Mentor Receives & Accepts

**Phone 2 (Mentor - Already logged in as Can Özkan):**
1. Check **Home** tab → look for "Incoming Requests" section
2. ✓ **Should see request from "Mert Aydin"** with submitted cover letter
3. Status should show **"Pending"**
4. Tap on the request
5. Expected: Request detail page appears with:
   - Mentee name, message, requested time
   - **Accept** and **Decline** buttons
6. Tap **Accept**
7. ✓ Expected: Request status updates to **"Accepted"**

**Validation on Phone 2 Dashboard:**
1. Return to **Home** tab
2. Under "Accepted Requests" or "Sessions" section
3. ✓ Should now list the session with Mert Aydin

---

### Phase 4: Mentee Verifies Acceptance

**Phone 1 (Mentee):**
1. Return to **Home** tab
2. Under "Your Requests" section
3. ✓ Request from Can Özkan should now show status: **"Accepted"**
4. Alternative: Under "Your Sessions" section should list the accepted session

---

## Edge Cases to Verify (Optional)

1. **Multiple Requests:** Phone 1 sends requests to 2-3 different mentors
   - Check all appear in "Your Requests"
   - Phone 2 and other mentors can see their respective incoming requests

2. **Skills Display:** Verify skill tags render correctly (not cutting off, scrollable if many)

3. **Availability Display:** Days expand/collapse; slots show booked status clearly

4. **Back Navigation:** Can navigate back from profile without losing request form state

5. **Form Validation:** Try sending empty cover letter (should show error

### Step B - Send Request from Phone 1
1. Phone 1: go to Discover.
2. Open mentor profile for `Can Ozkan` (username `can-ozkan`).
3. In Availability, tap a day, tap a slot.
4. Inline section `Request a Session` appears.
5. Write cover letter and tap `Send Request`.

Expected:
- Success message appears on Phone 1.
- Phone 1 Dashboard shows a pending outgoing request.

### Step C - Verify Incoming on Phone 2
1. Phone 2: open Dashboard.
2. Check `Pending Requests` section.

Expected:
- Incoming request from `Mert Aydin` is visible.

### Step D - Accept on Phone 2
1. Phone 2: open incoming request details.
2. Tap `Accept`.

Expected:
- Request leaves pending list.
- Session appears as upcoming (dashboard/schedule depending on layout state).

### Step E - Verify Status Sync on Phone 1
1. Phone 1: open Dashboard and Schedule.
2. Pull to refresh or revisit tab.

Expected:
- Original outgoing pending request is no longer pending.
- Upcoming session appears in schedule/session area.

### Step F - Profile Update Check (Phone 1)
1. Phone 1: open Profile.
2. Edit bio or skills and save.

Expected:
- Changes persist after leaving and returning to Profile.

## 5) Optional Quick API Verification

```bash
MENTEE_TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"mert.aydin@example.com","password":"mert-aydin-2026!"}' \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));process.stdout.write(j.access_token||"")')

curl -s http://127.0.0.1:8000/api/mentorship/requests/me/ \
  -H "Authorization: Bearer $MENTEE_TOKEN"
```

## 6) Notes
- Keep `EXPO_PUBLIC_ENABLE_MOCK_FALLBACK` disabled.
- If results look stale after account switch, fully log out and log in on each phone.
- Root endpoint (`/`) returning `404` is expected in this project.
