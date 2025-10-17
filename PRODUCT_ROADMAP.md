# Product Roadmap: Celestial Nexus
*Astrology-Based AI Platform: From Solo Exploration to Professional Coaching Infrastructure*

---

## 🎯 **Strategic Vision**

**Current State:** Data-driven AI astrology platform for individual self-exploration
**Target State:** Multi-tier platform serving individuals, coaches, and learners

**Core Value Proposition:**
> "Swiss Ephemeris data → Psychological insight, accessible to individuals, enhanced by coaches, and teachable to learners."

---

## 🏆 **HIGHEST PRIORITY: Workspace Model with Permission-Aware AI**

### Why This Wins
- **Network Effect Flywheel:** Coaches bring clients, clients stay, platform grows
- **Multi-Party Lock-In:** Both coaches and clients locked in (exponentially stickier than solo users)
- **10x Revenue Potential:** Coaches pay $99/mo vs solo users at $15/mo
- **Creates Moat:** "Magic moment" of AI adjusting to who's present is impossible to replicate
- **B2B2C Model:** More defensible than pure B2C

### ROI Analysis
**Before (solo only):**
- 500 users × $15/mo = $7,500/mo
- Churn: ~10%/mo

**After (coaching model):**
- 400 solo users × $15/mo = $6,000
- 25 coaches × $99/mo = $2,475
- 200 clients × $15/mo = $3,000
- **Total: $11,475/mo (53% increase)**
- Churn: ~3%/mo (coaches), ~5%/mo (clients)

---

## 📋 **Phase 1: Core Infrastructure (6-8 weeks)**
*Foundation for coaching platform*

### Database Schema
```sql
-- Workspaces
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text CHECK (type IN ('personal', 'coaching')),
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Workspace membership
CREATE TABLE workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('owner', 'coach', 'client', 'observer')),
  invited_at timestamptz DEFAULT now(),
  joined_at timestamptz,
  status text CHECK (status IN ('invited', 'active', 'inactive')),
  PRIMARY KEY (workspace_id, user_id)
);

-- Link conversations to workspaces
ALTER TABLE conversations 
  ADD COLUMN workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL;

-- Workspace charts (multiple charts per workspace)
CREATE TABLE workspace_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id), -- who this chart belongs to
  label text NOT NULL,
  birth_data jsonb NOT NULL,
  privacy text CHECK (privacy IN ('private', 'shared')) DEFAULT 'shared',
  created_at timestamptz DEFAULT now()
);

-- Coach notes (private to coach)
CREATE TABLE coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  note_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

-- Policies (examples)
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (SELECT user_id FROM workspace_members WHERE workspace_id = id)
  );

CREATE POLICY "Coaches can view their notes" ON coach_notes
  FOR ALL USING (auth.uid() = coach_id);
```

### Features
- **Workspace Creation:** Users can create "Personal" or "Coaching" workspaces
- **Invitations:** Coaches can invite clients via email
- **Role Management:** Owner, Coach, Client, Observer roles
- **Conversation Context:** All conversations tagged with workspace + participants
- **Auto-Migration:** Existing users get personal workspace auto-created

---

## 📋 **Phase 2: Permission-Aware AI (2-3 weeks)**
*AI that knows who's in the room*

### System Prompt Enhancement
```typescript
interface SessionContext {
  conversationType: 'solo' | 'observed' | 'live_session';
  participants: Array<{ id: string; role: 'client' | 'coach' }>;
  coachPresent: boolean;
  coachId?: string;
}

const getSystemPrompt = (context: SessionContext): string => {
  const basePrompt = `You are an AI guide for self-awareness.
Tone: Direct, a bit playful. Contractions welcome, dated slang not.
Lead with Human-centric translation and behavioral resonance, not planets or metaphors.
Astro jargon not, just the translation in emotional/meaning.`;

  if (context.conversationType === 'solo') {
    return basePrompt + `\n\nYou are speaking directly with the client. Be intimate and direct.`;
  }

  if (context.conversationType === 'observed') {
    return basePrompt + `\n\nCONTEXT: A coach is observing this conversation (but not actively participating).
- Maintain intimacy with the client
- Occasionally add: "[Coach note: This pattern might be worth exploring in session]"
- Explain astrological concepts slightly more clearly
- Highlight patterns that warrant deeper coaching exploration`;
  }

  if (context.conversationType === 'live_session') {
    return basePrompt + `\n\nCONTEXT: Coach and client are both present in this conversation.
- You are a facilitating third party
- Address both coach and client when relevant:
  - "[To client]: Your Mars here suggests..."
  - "[To coach]: You might explore their Venus aspect next..."
- Explain concepts for both audiences
- Highlight dynamics for coach to work with
- Stay supportive but educational`;
  }

  return basePrompt;
};
```

### Implementation Details
- Update `llm-handler-gemini` to accept `sessionContext` in request
- Add workspace + member lookup before generating response
- Pass context through to prompt generation
- Store conversation metadata with participant info

---

## 📋 **Phase 3: Coach Dashboard (3-4 weeks)**
*Simple, focused interface for coaches*

### Features

#### Client Management
- **Client List View**
  - Name, chart thumbnail, last session date
  - Quick status indicators (active, new, needs attention)
  - Filter by workspace
  
- **Client Detail View**
  - Chart overview
  - Conversation history
  - Coach's private notes
  - AI-generated insights about patterns

#### Quick Tools
- **Chart Compare:** Overlay 2+ charts for compatibility analysis
- **Session Prep:** AI suggests themes to explore based on recent conversations
- **Pattern Recognition:** AI highlights recurring themes across client's conversations
- **Quick Notes:** Jot down observations during/after sessions

#### Analytics (Light)
- **Client Engagement:** How often client uses AI between sessions
- **Theme Tracking:** What topics client explores most
- **Progress Indicators:** Sentiment over time, depth of exploration

#### NOT Included (Intentionally)
- ❌ Scheduling/calendar (use existing tools)
- ❌ Payment processing (use Stripe/PayPal)
- ❌ Complex CRM features
- ❌ Marketing automation

**Philosophy:** Focus on *content of coaching*, not business operations

---

## 🎯 **Tier 1: Solo User Enhancements**
*Features that work for individual users AND set up coaching value*

### 1. Question Library (2 weeks)
**Problem:** Users don't know what to ask their chart

**Solution:** Curated question sets by life area

**Categories:**
- **Self-Understanding**
  - "What shadow do I avoid?"
  - "Where do I seek validation?"
  - "What's my authentic expression?"
  
- **Relationships**
  - "What patterns do I repeat in conflict?"
  - "Where do I compromise authenticity?"
  - "What do I need to feel safe?"
  
- **Career/Purpose**
  - "What work energizes vs. drains me?"
  - "Where does impostor syndrome show up?"
  - "What's my natural leadership style?"
  
- **Growth Edges**
  - "Where do I resist change?"
  - "What limiting belief holds me back?"
  - "Where can I be more courageous?"

**Implementation:**
- Dropdown/modal in chat: "Not sure what to ask? Try these..."
- Questions auto-inject chart context into prompt
- Track which questions resonate (for personalization)

**Value for Coaches:** Coaches can create custom question sets for clients

---

### 2. Temporal Anchoring: Current Transits (2 months)
**Problem:** Chart is static, but life isn't

**Solution:** AI contextualizes current transits relative to birth chart

**Features:**
- **"What's Active Now?" button** → Quick current transit summary
- **User asks about current situation** → AI automatically references relevant transits
- **Transit explanations** → "Saturn's transiting your 10th house (2.5-year career restructuring phase)"

**Implementation:**
- Calculate transits on-demand using Swiss Ephemeris
- Cache transits (recalculate daily)
- No proactive notifications (stay pull-based)

**User Experience:**
```
User: "Why am I feeling stuck?"
AI: "Your natal Sun is being challenged by transiting Saturn right now. 
This is a 2.5-year restructuring phase focused on your career sector..."
```

**Value for Coaches:** Coaches can track client transits and time interventions

---

### 3. Pattern Recognition Across Conversations (6 months)
**Problem:** Insights get lost in chat history; users repeat themes unconsciously

**Solution:** AI tracks recurring themes and surfaces them

**Examples:**
- "You've asked about relationships 3 times this month. Notice a pattern?"
- "This fear of change came up 2 weeks ago. What's shifted?"
- After 5+ chats: "Your core themes: boundaries (45%), creative expression (30%), trust (25%)"

**Implementation:**
- Lightweight metadata extraction from conversations
- Store theme tags per conversation
- Generate quarterly "Pattern Summary" (opt-in)
- Privacy: encrypted storage, user can delete anytime

**Value for Coaches:** Coaches see aggregate patterns across all client conversations

---

### 4. Conversation Bookmarking (1 week)
**Problem:** Powerful insights get lost in long chats

**Solution:** Users bookmark specific AI responses

**Features:**
- Bookmark icon on any message
- "Bookmarks" tab shows all saved insights
- Add personal notes to bookmarks
- Export bookmarks as PDF

**Value for Coaches:** Clients can share bookmarked insights with coach

---

### 5. Reflection Prompts (Post-Conversation) (2 weeks)
**Problem:** Insights fade without integration

**Solution:** Optional 1-3 post-chat reflection questions

**Triggers:**
- Only after "meaningful" conversations (AI determines via sentiment/depth analysis)
- Max once per day (avoid spam)

**Example Prompts:**
- "What's one small action that honors what we discussed?"
- "What resistance came up during this conversation?"
- "What would you tell yourself 6 months ago?"

**Implementation:**
- Responses saved as private notes (not sent to AI unless user chooses)
- Optional reminder: "You set an intention 2 weeks ago. Revisit it?"

**Value for Coaches:** Coaches can assign custom reflection prompts

---

### 6. Life Event Tagging (3 weeks)
**Problem:** Hard to remember when transits correlated with real events

**Solution:** Tag conversations/dates with life events

**Examples:**
- "Got promoted" (tag: March 2024)
- "Relationship ended" (tag: July 2024)
- "Started therapy" (tag: Jan 2024)

**Value:**
- Over time, AI: "Last time Jupiter was here, you got promoted. What's emerging now?"
- Validates astrology through lived experience
- Creates personal case study of patterns

**Implementation:**
- Simple tag system (like folders, but date-anchored)
- Optional: "Event timeline" view (tags + transits overlaid)

**Value for Coaches:** See client's life timeline + astrological correlations

---

## 🧠 **Tier 2: Coaching-Specific Features**

### 7. Guided Session Templates (1 month)
**Problem:** Coaches need structure for different session types

**Solution:** Pre-structured conversation flows

**Templates:**
- **First Session:** "Getting to know your chart"
- **Relationship Deep-Dive:** Structured compatibility exploration
- **Career Transition:** Decision-making through chart lens
- **Shadow Work:** Exploring difficult placements
- **Integration Session:** Reviewing patterns across sessions

**How It Works:**
- Coach selects template
- AI guides conversation with progressive prompts
- Coach can override/customize at any point
- Client sees seamless conversation (not "template-y")

**Example Flow (Career Transition):**
1. AI: "Let's explore your natal 10th house (career/purpose)..."
2. After response: "Now let's look at what's currently transiting..."
3. After response: "How does this align with your MC sign?"
4. Synthesis at end

---

### 8. Shared Insight Library (2 weeks)
**Problem:** Coach repeats same explanations

**Solution:** Coach can "pin" insights for client to revisit

**Features:**
- Coach pins AI responses as "Key Insights"
- Client sees these in personal library
- Client can ask follow-up questions anytime
- Over time, builds personalized astrology reference

**Example:**
```
Coach pins: "Your Moon in 8th house = emotional intensity"
Client library now includes this + can expand it later
Reduces repetitive explaining, builds client knowledge
```

---

### 9. Multi-Chart Conversations (3 weeks)
**Problem:** Compatibility requires comparing charts

**Solution:** AI facilitates 2+ charts in one conversation

**Use Cases:**
- **Couple's session:** Both charts explored together
- **Family dynamics:** Parent + child
- **Team/business partners:** Work compatibility
- **Self over time:** Birth chart + progressions

**AI as Translator:**
```
AI: "[Person A]: Your Mars in Aries wants direct action..."
    "[Person B]: Your Venus in Libra seeks harmony first..."
    "[Together]: This creates creative tension around decision-making..."
```

**Privacy Model:**
- All parties consent to shared session
- Each person can have private pre-chat with AI
- Option for "anonymous chart comparison" (coach sees dynamics, not identities)

---

### 10. Session Recording & Analysis (For Coach Development) (4 weeks)
**Problem:** Coaches want to improve their practice

**Solution:** AI analyzes coaching sessions

**Flow:**
1. Coach conducts session (text-based)
2. Afterward, AI analyzes:
   - Key themes discussed
   - Astrological aspects explored vs. missed
   - Client emotional tone throughout
   - Coach intervention style
3. Generates "Session Summary" for coach's notes
4. Suggests areas for next session

**Privacy:**
- Coach owns this data
- Client never sees analysis (it's for coach development)
- Optional: client can request their own AI summary

---

### 11. Homework/Reflection Assignment (1 week)
**Problem:** Clients need continuity between sessions

**Solution:** Coach assigns tasks/reflections

**Types:**
- **Reflection:** "Notice when X pattern shows up this week"
- **Exploration:** "Ask your chart about [specific aspect]"
- **Integration:** "Journal about [theme from session]"

**Flow:**
- Coach assigns → Client sees in task list → Client completes
- Coach reviews before next session
- Privacy: Client controls what coach sees

---

## 🎓 **Tier 3: Educational Layer**

### 12. Progressive Disclosure Learning System (6 months)
**Problem:** Users want to understand astrology, but it's overwhelming

**Solution:** Teach through exploration, not courses

**Levels:**
1. **Curious** → Chart as conversation partner (current experience)
2. **Learner** → Chart + explanations of *why* AI said that
3. **Practitioner** → Raw chart data + interpretation practice

**Implementation:**
- Toggle in settings: "Show me the astrology" (off by default)
- When enabled, AI responses include expandable sections:

```
[User: "Why do I avoid conflict?"]

[AI: Your Mars in Libra seeks harmony over confrontation...]

[▼ Show Astrology]
Mars Placement: Libra (7th house)
Key Aspects: Square Moon (emotional conflict), Trine Venus (charm)
Translation: Mars = drive/anger, Libra = balance-seeking
Core Tension: Assertion vs. Peace-keeping
Why this matters: Mars wants to act, Libra wants to weigh options
```

**Progressive Challenges:**
- After 10+ conversations: "Want to try interpreting this yourself first?"
- AI shows chart section, user guesses, AI gives feedback
- Over time, user learns the language naturally

---

### 13. Micro-Lessons (Contextual Learning) (3 months)
**Problem:** Traditional astrology courses are dry

**Solution:** Learning triggered by conversation

**How It Works:**
- User asks about Mars → AI offers: "Want a 1-min explainer on Mars?" (optional)
- After 5 sessions → "You've encountered 'aspects' a lot. Quick 3-min lesson?" (optional)
- Builds knowledge without interrupting flow

**Knowledge Graph Tracking:**
```javascript
user_knowledge: {
  planets: { mars: 'familiar', venus: 'new', saturn: 'confused' },
  houses: { 1st: 'understood', 8th: 'new' },
  aspects: { square: 'practiced', trine: 'new' }
}
```

**AI Adjusts:**
- Skips explanations user already knows
- Offers deeper dives on topics user is ready for
- Creates personalized learning path

---

### 14. "Teach Mode" for Aspiring Astrologers (6 months)
**Problem:** People want to learn astrology professionally

**Solution:** Practice sandbox with AI feedback

**Features:**
- **Interpretation Sandbox:** AI gives you a chart, you interpret, get feedback
- **Comparison Mode:** Your interpretation vs. AI's (learn from differences)
- **Blind Chart Practice:** AI generates scenario, you interpret, reveals answer
- **Progressive Challenges:** Basic → Intermediate → Professional level

**Certification Path:**
- Complete 50 practice readings
- Pass interpretation challenges
- Demonstrate understanding of core concepts
- Earn "Practitioner" badge
- Unlock coach features

**Monetization:** Premium tier for coaches-in-training ($49/mo)

---

### 15. Coach Training Mode (4 months)
**Problem:** Coaches want to improve their astrological knowledge

**Solution:** AI coaches the coach

**Features:**
- **Practice Charts:** Anonymized real charts or generated scenarios
- **Challenge Scenarios:** "Client says X. What aspects would you explore?"
- **AI Coaching:** "Good instinct. Also consider [aspect Y] because..."
- **Debrief Mode:** After session, coach asks: "What did I miss?"

**Example:**
```
Coach: [Reviews client chart before session]
AI: "Key themes to explore: Authority issues (Saturn), Creative blocks (5th house)"
Coach: [Conducts session]
Coach: "What patterns emerged I should note?"
AI: "Client circled back to authority 3 times. Their Saturn square Sun suggests 
     relationship with structure/discipline is central. Consider exploring father 
     relationship or early childhood authority dynamics."
```

---

## 🎨 **Tier 4: UX Enhancements**

### 16. Smart Context Memory (2 weeks)
**Problem:** Users re-explain context across sessions

**Solution:** AI proactively remembers key context

**Examples:**
- "Last time you mentioned your sister..."
- "You're navigating that job decision we discussed..."
- "Still processing that breakup from last month?"

**Implementation:**
- Summarize key facts from conversations
- Store in conversation metadata: relationships, goals, events, fears
- Privacy: user can view/delete stored context anytime

---

### 17. "Ask Your Chart" vs. "Ask Me" Toggle (1 week)
**Problem:** Sometimes want chart interpretation, sometimes life coaching

**Solution:** Subtle mode toggle changes AI emphasis

**Modes:**
- **Chart Focus:** Astro-data-heavy responses
- **Coaching Focus:** More psychology, less astro jargon
- **Balanced:** Current default

**Same data, different lens**

---

### 18. "Try This" Micro-Experiments (2 weeks)
**Problem:** Insights feel abstract; users want actionable guidance

**Solution:** AI suggests small behavioral experiments

**Examples:**
- "Your Mars in 3rd suggests energy through communication. Try: write for 10min daily this week."
- "Sun square Saturn? Experiment: set one boundary this week without apologizing."
- "Moon in Pisces? Notice when you absorb others' emotions vs. your own."

**Implementation:**
- Only offered when relevant (not every chat)
- User can save as "intentions"
- Optional check-in: "How did that experiment go?"

---

### 19. Development Paths (Goal-Oriented Mode) (3 months)
**Problem:** Astrology can feel fatalistic

**Solution:** Goal-oriented mode using chart as map

**Flow:**
```
User: "I want to be more confident"
AI: "Let's map that through your chart..."
AI: "Your chart shows natural confidence in [X area]. Let's build from there..."
AI: [Identifies resources to leverage]
AI: [Identifies challenges to watch]
AI: [Creates 3-step pathway]
```

**Reframes chart as resource for growth, not fixed identity**

---

### 20. Aspect Deep-Dives (Structured Exploration) (2 months)
**Problem:** Complex questions need more than chat

**Solution:** AI detects complexity and offers structured mini-journey

**Example:**
```
User: "Why do I sabotage relationships?"
AI: "This touches multiple chart areas. Want to break it down?" [yes/no]
If yes:
  → Sub-Q1: Venus placement (fear of vulnerability)
  → Sub-Q2: Saturn aspects (authority/control)
  → Sub-Q3: Moon in 8th (emotional intensity fear)
  → Synthesis: "Your pattern is a triangle of..."
```

**Honors complexity without overwhelming**

---

## 💰 **Monetization Strategy**

### Tier 1: Free (Solo Users)
- 10 conversations/month
- Basic chart access
- Community learning resources
- **Goal:** Acquisition & education

### Tier 2: Premium (Power Users)
- Unlimited conversations
- All report types
- Temporal features (transits, progressions)
- Bookmarking & pattern recognition
- **$15-25/month**
- **Goal:** Core individual users

### Tier 3: Coach License
- Everything in Premium
- Create coaching workspaces
- Invite up to 50 clients
- Session templates & tools
- Coach dashboard & analytics
- Multi-chart sessions
- Client collaboration features
- **$99-199/month** (per coach)
- **Goal:** Professional users, B2B revenue

### Tier 4: Coach-in-Training
- Everything in Premium
- Teach Mode access
- Practice sandbox
- AI feedback on interpretations
- Certification path
- **$49/month**
- **Goal:** Educational market, future coaches

### Tier 5: Enterprise/School
- Unlimited coaches/students
- White-label option
- Custom curriculum integration
- Admin controls
- Bulk pricing
- **Custom pricing**
- **Goal:** Institutions, bulk sales

---

## 🚫 **Anti-Roadmap: What NOT to Build**

These would dilute the core value:

- ❌ **Daily horoscopes/notifications** → spam
- ❌ **Social feed/community** → dilutes personal focus
- ❌ **Gamification** (badges, streaks) → gimmicky
- ❌ **Predictive claims** ("You'll meet someone in March") → unethical
- ❌ **Generic affirmations/manifestation** → off-brand, woo
- ❌ **Complex CRM features** → not our core
- ❌ **Scheduling/calendar tools** → use existing tools
- ❌ **Payment processing** → use Stripe
- ❌ **Video calls** → use Zoom

**Principle:** Only build features that answer: *"Does this help users know themselves better or act on that knowledge?"*

---

## 📊 **Success Metrics**

### North Star Metric
**Weekly Active Users having meaningful conversations** (not just logins)

### Key Metrics by Tier

**Solo Users:**
- Conversations per user per month
- Retention at 30/60/90 days
- Upgrade to Premium rate
- Pattern recognition engagement

**Coaches:**
- Clients per coach (target: 10-30)
- Coach retention (target: >90% after 3 months)
- Session frequency per coach
- Client satisfaction scores

**Platform:**
- Coach → Client conversion (clients who become coaches)
- LTV:CAC ratio
- Network density (avg connections per user)
- AI quality scores (user ratings per conversation)

---

## 🎯 **Implementation Priorities**

### Quarter 1: Foundation (Months 1-3)
**FOCUS: Get coaching infrastructure working**
1. Workspace model (schema + RLS)
2. Permission-aware AI
3. Basic coach dashboard
4. Invitation system
5. Multi-chart conversations

**Goal:** 10 beta coaches using platform

### Quarter 2: Coach Tools (Months 4-6)
**FOCUS: Make coaches successful**
1. Session templates
2. Shared insight library
3. Coach notes system
4. Session analysis
5. Homework assignment

**Goal:** 50 coaches, 500 clients

### Quarter 3: Educational Layer (Months 7-9)
**FOCUS: Deepen engagement & learning**
1. Progressive disclosure ("Show astrology" toggle)
2. Micro-lessons system
3. Teach Mode (practice sandbox)
4. Knowledge tracking
5. Pattern recognition (solo users)

**Goal:** 30% of users engage with educational features

### Quarter 4: Scale & Refine (Months 10-12)
**FOCUS: Polish & growth**
1. Temporal features (transits)
2. Life event tagging
3. Development paths
4. Aspect deep-dives
5. Advanced analytics

**Goal:** 100 coaches, 1000 clients, 2000 solo users

---

## 🔑 **Key Principles**

1. **Data-driven core, not gimmicks** → Swiss Ephemeris as foundation
2. **Human + AI, not human vs. AI** → Coach remains central
3. **Progressive disclosure** → Complexity available, not forced
4. **Privacy-first** → Users control what's shared, encrypted storage
5. **Pull-based, not push** → No spam notifications
6. **Education through exploration** → Learn by doing, not courses
7. **Network effects** → Each user makes platform better
8. **Clean UX** → Features appear when needed, hidden otherwise

---

## 💡 **Competitive Moats**

1. **Permission-aware AI** → No one else has context-shifting AI
2. **Swiss Ephemeris integration** → Real calculations, not parlor tricks
3. **Coach + Client lock-in** → Multi-party stickiness
4. **Knowledge graph** → Gets smarter with each user
5. **Educational layer** → Creates own supply of coaches
6. **Professional credibility** → Serious tool, not toy

---

## 🚀 **Go-to-Market Strategy**

### Phase 1: Beta Coaches (Months 1-3)
- Hand-pick 10 professional astrologers
- Free coaching tier
- Weekly feedback sessions
- Co-create features

### Phase 2: Coach Referrals (Months 4-6)
- Beta coaches invite other coaches
- Referral incentives
- "Built by coaches, for coaches" messaging

### Phase 3: Coach Networks (Months 7-9)
- Partner with astrology schools
- Offer Teach Mode for students
- Create certification path
- Alumni become paying coaches

### Phase 4: Direct-to-Consumer (Months 10-12)
- Content marketing (astrology explained)
- SEO for long-tail queries
- Solo users who want coaching can find coaches on platform
- Closed loop: Solo → Client → Coach → More Clients

---

## 📝 **Notes on Implementation**

- Start with PostgreSQL schema changes
- RLS policies critical for workspace privacy
- Edge functions need `workspace_id` and `participant_context`
- Frontend needs workspace selector/switcher
- Coach dashboard can be separate route (`/coach`)
- Keep solo user experience unchanged (workspace features hidden)

---

*Last Updated: January 2025*
*This is a living document. Priorities may shift based on user feedback and market conditions.*

