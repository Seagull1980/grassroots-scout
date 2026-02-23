# UX Review: Advert Posting & Searching Workflow
**Date:** February 23, 2026  
**Focus:** Improving the experience for coaches posting vacancies and players/parents searching & responding

---

## 📊 WORKFLOW OVERVIEW

### Coach Journey (Posting Team Vacancies)
1. **Navigate** to `/post-advert`
2. **Fill form** with 3-step stepper (Basic Info → Details → Review)
3. **Select team** from dropdown
4. **Post** → Redirected to `/my-adverts`
5. **Manage** adverts (pause, repost, edit, close, delete)
6. **View analytics** (views, saves, inquiries)
7. **Respond** to inquiries via `/messages`

### Player/Parent Journey (Posting Availability & Searching)
1. **Browse** teams via `/search` with filters
2. **Save interesting adverts** to collections
3. **Send messages** to coaches via advert detail view
4. **Track** follow-ups in `/messages`

---

## 🎯 CURRENT STRENGTHS

✅ **Comprehensive filtering** - Filters by league, age group, position, location, distance  
✅ **Multi-step form** - Stepper provides clear progress for posting  
✅ **Analytics dashboard** - Coaches can see views, saves, inquiries  
✅ **Draft saving** - Users can save form drafts locally  
✅ **Reposting** - Quick refresh of old adverts  
✅ **Search history** - Recent searches saved for quick reuse  
✅ **Messaging system** - Integrated contact mechanism  
✅ **Auto-extend** - Adverts can auto-extend before expiring  

---

## 🚨 PAIN POINTS & UX ISSUES

### 1. **DISCOVERABILITY: Hard to Know What Information to Provide**
**Problem:**  
- New coaches don't know what details attract players (experience requirements, training schedule, playing time policy)
- Players don't know what information coaches need to see
- Form lacks contextual help and examples

**Impact:** Lower advert quality, fewer matches, more generic posts

**Suggestions:**
- [ ] Add **inline help text** with examples for each field
- [ ] Create **AI-powered suggestions** while typing descriptions
- [ ] Show "Example Adverts" modal before form starts
- [ ] Add **quality score indicator** showing description completeness
- [ ] Suggest required/recommended fields based on user role and team type

---

### 2. **FILTERING NOISE: Too Many Irrelevant Results**
**Problem:**  
- Searching returns large result sets with weak filtering
- Users must manually check each advert for relevance
- No smart matching algorithm (e.g., coaches don't filter by position preference)
- Distance radius fixed at starting point - many users don't use location filters

**Impact:** Players overwhelmed, coaches don't see qualified players

**Suggestions:**
- [ ] **Smart match scoring** - Show relevance % based on position/experience fit
- [ ] **Advanced filters pre-populated** based on user profile
  - If player profile says "Experienced Midfielder", pre-filter to goalkeeper-seeking teams
  - If coach seeks "U14-U16", only show availability in that age group
- [ ] **Show "best match" adverts first** by default
- [ ] **Auto-suggest filter combinations** that return 5-20 results
- [ ] **Highlight missing information** ("This advert needs location info for better matching")

---

### 3. **RESPONSE FRICTION: Messaging Isolated from Advert Context**
**Problem:**  
- Users send initial message but context is lost in `/messages`
- No quick way to view original advert from message thread
- Message templates don't suggestion what to mention
- Players can't easily track multiple inquiry statuses (pending, interested, rejected)

**Impact:** Mismatches, longer negotiation cycles, abandoned inquiries

**Suggestions:**
- [ ] **Add advert card preview** in message thread (always visible or in sidebar)
- [ ] **Advert as message context** - Show above conversation
- [ ] **Smart message suggestions**:
  - For players: "I'm interested in your [position] vacancy at [team]..."
  - Template: Experience level, availability, questions about training
- [ ] **Status tracking metadata**:
  - Option to mark message thread as "waiting for response", "offered trial", "declined", etc.
  - Quick status chips in message list
- [ ] **Quick actions in messages**:
  - "Add to my team" button (coaches)
  - "Accept trial invitation" button (players)
  - "Schedule call" button with calendar integration

---

### 4. **VISIBILITY: Coaches Don't Know Why Their Adverts Aren't Getting Inquiries**
**Problem:**  
- Analytics show views but no guidance on improving
- Adverts might be hidden due to filters coaches don't understand
- No comparison with similar successful adverts
- Auto-extend just extends - doesn't reposition in search results

**Impact:** Coaches post once, get discouraged, don't follow up

**Suggestions:**
- [ ] **Actionable analytics insights**:
  - "Your views are 30% below average for U14 vacancies"
  - "Try adding a team photo to increase engagement"
  - "Consider specifying 'weekly training schedule' - similar posts get 45% more inquiries"
- [ ] **Advert health check**:
  - Missing description length (<100 characters = warning)
  - Missing location = major warning
  - Missing team info = suggestion
- [ ] **Competitive positioning**:
  - "Your advert matches 150 available players (showing position filter)"
  - "Your advert is #4/8 in this search" (when searching own type)
  - "Consider rephrasing position from 'striker' to be more inclusive"
- [ ] **A/B test suggestions**:
  - "Try adding 'pathway to senior football' - similar posts see 25% more inquiries"
- [ ] **Repost optimization**:
  - When reposting, suggest: "Change title slightly", "Add recent match recording link", "Refresh description"

---

### 5. **DECISION PARALYSIS: Players Can't Compare Multiple Opportunities**
**Problem:**  
- No way to compare 2+ adverts side-by-side
- Saved adverts scattered across the platform
- Can't batch message multiple teams
- No shortlist/comparison cart feature

**Impact:** Players make hasty decisions or abandon search entirely

**Suggestions:**
- [ ] **Comparison view**:
  - Select 2-4 adverts → View side-by-side table
  - Comparison columns: Position, Age Group, League, Location, Training Days, Pathway, etc.
- [ ] **Smart collections**:
  - Move beyond generic "Save" to **"Shortlist"**, **"Applied"**, **"Trial Scheduled"**, **"Backup Options"**
  - Metadata for each: date added, notes, last contacted, status
- [ ] **Batch messaging**:
  - Select multiple adverts → "Contact All" button
  - Creates individual messages with custom template
  - Track responses in unified inbox
- [ ] **Interest ranking**:
  - Drag-to-reorder saved adverts
  - Rate saved adverts 1-5 stars
  - Export list to PDF/email

---

### 6. **RESPONSE TIMING: No Sense of Urgency or Deadlines**
**Problem:**  
- Adverts show no expiration status in search results
- Players don't know if position still available
- Coaches don't know if applicant is still interested
- No deadline communicated for responding

**Impact:** Wasted time on expired opportunities, low response rates

**Suggestions:**
- [ ] **Expiration visibility**:
  - Add "Expires in 5 days" badge to search results
  - Color code: Green (>7 days), Yellow (3-7 days), Red (<3 days)
  - Show exact date in tooltip
- [ ] **Application deadline mechanism**:
  - Coaches can set: "Respond by [date]" on vacancy
  - Shows countdown to players
  - Reminder email to players at 48-hour mark
- [ ] **Status updates**:
  - Coaches can reply: "Thanks for interest - we'll decide by [date]"
  - Creates milestone in conversation
- [ ] **Follow-up reminders**:
  - Email to player: "You favorited [advert] 7 days ago - still interested?"
  - Email to coach: "You posted [vacancy] 14 days ago - no inquiries yet. Refresh?"

---

### 7. **FORM FRICTION: Posting Requires Too Many Steps**
**Problem:**  
- 3-step stepper required even for simple postings
- Location must be typed (no autocomplete in current version)
- Position selection limited (coaches can't specify sub-positions)
- Team selection mandatory but may be confusing for new coaches

**Impact:** Higher abandonment rate on form, especially mobile

**Suggestions:**
- [ ] **Quick post for repeat posters**:
  - Button: "Quick post" → Uses last vacancy's details as template
  - Only change position, deadline, notes
  - 1-step instead of 3
- [ ] **Smart defaults**:
  - Pre-fill from coach's profile (location, team)
  - Suggest position based on team's recent hires
- [ ] **Location autocomplete**:
  - Already has Google Places integration - verify it works smoothly
  - Show suggestions while typing
- [ ] **Position granularity**:
  - Main position dropdown → Get secondary/flexible options
  - E.g., "Striker" → Can also play "Left Wing"
- [ ] **Mobile optimization**:
  - Full-width inputs on mobile
  - Larger tap targets for buttons
  - Consider single-step form for mobile
- [ ] **Form abandonment recovery**:
  - If user leaves mid-form, save to drafts automatically (already implemented)
  - Show "Resume draft?" notification on return

---

### 8. **SEARCH EXPERIENCE: Limited Sorting and Organization**
**Problem:**  
- Sort options limited to: newest, oldest, alphabetical
- No sorting by relevance (smart match), distance, or team reputation
- Can't filter by "trying new players" vs "replacing specific role"
- Search result cards show same info for all adverts

**Impact:** Players miss better opportunities, rely on luck

**Suggestions:**
- [ ] **Relevance-based sorting** (default):
  - Algorithm considers: position match, age group, experience level, distance from profile
  - Shows score: "95% match - Midfielder, U16 league, 8km away"
- [ ] **Sort options expanded**:
  - Relevance (smart match) ⭐
  - Newest first
  - Closest to me
  - Most popular (most views/inquiries)
  - Highest team reputation (if reputation feature exists)
- [ ] **Adaptive result cards**:
  - For position-specific searches: Highlight training schedule, pathway
  - For league-specific: Highlight team achievements, records
  - For location-specific: Highlight distance
- [ ] **Saved search intelligence**:
  - Remember which sort player used most
  - "You usually sort by 'closest to me'" - make it default
- [ ] **Search refinement assistance**:
  - "Found 47 results. Too many? Try narrowing: [add position filter], [add distance], [select specific league]"

---

### 9. **NOTIFICATION GAP: No Proactive Engagement**
**Problem:**  
- Coaches post and wait for inquiries (passive)
- Players search manually (no recommendations)
- No notifications for message replies
- Auto-extend doesn't re-list, just extends duration

**Impact:** Low engagement, missed opportunities go unnoticed

**Suggestions:**
- [ ] **Relevant notifications for coaches**:
  - "New player matching your vacancy: [name, position, experience]"
  - "Your advert is about to expire (3 days): [Quick extend button]"
  - "Another coach posted similar vacancy - check their inquiries"
- [ ] **Personalized recommendations for players**:
  - Email: "3 new team vacancies matching your profile"
  - In-app: "New matches for you" card on dashboard
  - Frequency: Configurable (daily, weekly, never)
- [ ] **Notification preferences**:
  - Coaches can toggle: inquiries, expiring soon, similar posts
  - Players can toggle: new matches, messages, admin announcements
- [ ] **Smart notification timing**:
  - Don't notify outside typical "checking times"
  - Batch notifications instead of 1-per-event
- [ ] **Re-listing optimization**:
  - When auto-extending, option to: Renew timestamp, Refresh position in search, Update details

---

### 10. **TRUST & SAFETY: Limited Social Proof**
**Problem:**  
- Can't see coach/player reputation or previous matches
- No verification badges
- Can't see team history or successful matches
- Anonymous message senders (users only see names)

**Impact:** Hesitation to engage, especially for parents

**Suggestions:**
- [ ] **Reputation/credibility indicators**:
  - Green checkmark for email-verified coaches
  - Badge for "Posted 10+ adverts"
  - Star rating if user has completed matches
  - "Member since [year]"
- [ ] **Coach profile snippets** in advert:
  - "Posted by: John Smith (Verified Coach ✓, 5 adverts posted)"
  - Click → Quick profile preview
- [ ] **Team information** in vacancy:
  - Team photo/logo
  - "Est. 2015 | Local league champions 2024"
  - Link to team profile/website
- [ ] **Parent safety features**:
  - "DBS-checked coaches" badge option
  - Safeguarding policy link requirement
  - FAQ: "How to verify a coach's credentials"
- [ ] **Match history visibility** (if available):
  - "This team has successfully matched with 12 players"
  - "This coach has helped 5 players find teams"

---

## 📱 MOBILE-SPECIFIC ISSUES

**Problems:**
- Form fields small on mobile
- Search results hard to scan on small screens
- Analytics modal likely doesn't fit
- Message thread + advert context difficult to display

**Suggestions:**
- [ ] **Mobile-first form redesign**:
  - Stack fields vertically with larger tap targets
  - Full-width buttons
  - Progress bar instead of stepper
- [ ] **Search cards mobile optimized**:
  - Simpler layout with key info only
  - Swipe between results (next/previous)
  - Bottom sheet for detailed view (not modal)
- [ ] **Bottom navigation tabs**:
  - Search | Saved | Messages | My Adverts (for phone screen)
- [ ] **Conversation view**:
  - Show advert preview at top of conversation
  - Sticky message input at bottom

---

## 🎯 PRIORITY RECOMMENDATIONS

### **QUICK WINS (1-2 weeks)**
1. **Add inline help text** to post advert form with examples
2. **Add expiration badges** to search results (expires in X days)
3. **Show advert in message context** (sidebar or above conversation)
4. **Add quality score indicator** to advert posting
5. **Pre-populate search filters** from user profile

### **HIGH IMPACT (2-4 weeks)**
1. **Smart match relevance scoring** and sorting
2. **Status tracking for inquiries** (Applied/Shortlisted/Under Review/etc.)
3. **Actionable analytics insights** for coaches
4. **Comparison view** for multiple adverts
5. **Message templates/suggestions**

### **MEDIUM IMPACT (4-8 weeks)**
1. **Smart collections** (moved beyond simple Save)
2. **Batch messaging** to multiple coaches/players
3. **Notification system** with smart timing
4. **Reputation/credibility indicators**
5. **Quick repost** for repeat posters

### **NICE-TO-HAVE (Future)**
1. **A/B testing suggestions** for adverts
2. **Video match recording uploads** for coaches
3. **Calendar integration** for trial scheduling
4. **Team analytics** dashboard for coaches
5. **Match completion tracking** (did this lead to a signing?)

---

## 📊 SUCCESS METRICS TO TRACK

- **Advert quality score** (by description length, completeness)
- **Inquiry response rate** (% of inquiries getting replies)
- **Message-to-match conversion** (inquiries → trials → registrations)
- **Average time-to-match** (days from advert post to agreed trial)
- **Player satisfaction** (NPS for search/match experience)
- **Coach satisfaction** (NPS for advert posting/inquiry experience)
- **Mobile vs desktop conversion** rates
- **Search abandonment rate** (filter set but no action)
- **Saved advert conversion** (% of saves that lead to inquiries)

---

## 🔄 ITERATION CYCLE

1. **Pick 2-3 quick wins** from list above
2. **Implement & measure** success metrics
3. **Gather user feedback** (optional: survey or session recording)
4. **Prioritize next batch** based on impact
5. **Repeat monthly**

This ensures continuous improvement while maintaining product stability.
