# Coaches with Children - Current Gaps & Solutions

## Overview
Currently, the system has separate flows for:
1. **Coaches** - manage teams, post vacancies, post player availability
2. **Parent/Guardians** - manage their children, post child availability
3. **Players** - post personal availability

However, there's no support for **coaches who also have children playing** (either in their own team or other teams). This creates several issues:

---

## Current System Limitations

### 1. **Role Conflict**
- A coach account can only have the role "Coach"
- A parent account must have the role "Parent/Guardian"
- **Problem**: A coach cannot manage their children through the same account
- **Impact**: Coaches with children must create a separate "Parent/Guardian" account to manage their kids

### 2. **Team Participation Tracking**
- **Team Rosters** (`team_rosters`, `team_players`) - coaches manage player rosters
- **Player Availability** - individual players post availability
- **Child Availability** - parents post on behalf of children
- **Problem**: No link between players and their family relationships (e.g., coach-child)
- **Impact**: System cannot enforce age verification or detect conflicts of interest

### 3. **Match Completion & Verification**
- **Current**: Match completions only track `coachId` and `playerId` OR `childAvailabilityId`
- **Problem**: Cannot track coach-as-parent relationships or detect when a coach's child joins their team
- **Impact**: No audit trail for favoritism or family dynamics

### 4. **Tournament/League Eligibility**
- No tracking of family relationships for team composition rules
- Some leagues have rules about coaches' relatives in squads
- **Impact**: Manual verification needed; system can't enforce automatically

### 5. **Notifications & Permissions**
- Coaches cannot view their own children's availability postings
- Children's match completions go to parent account, not coach account
- **Impact**: Fragmented notifications across multiple accounts

---

## Proposed Solutions

### Solution 1: Extended Role System (Simple)
**Allow coaches to have secondary role of "Parent/Guardian"**

```typescript
// User schema change
role: 'Coach' | 'Player' | 'Parent/Guardian' | 'Admin'
// Change to:
roles: ['Coach'] | ['Coach', 'Parent/Guardian'] | ['Player'] | etc.
```

**Pros**: 
- Coaches can manage children without separate account
- Reuses existing parent/guardian functionality
- Backward compatible

**Cons**:
- UI navigation complexity
- Role checking logic needs refactoring
- Existing filters like `user.role === 'Coach'` break

---

### Solution 2: Family Relationships Table (Recommended)
**Create explicit family links in database**

```sql
CREATE TABLE family_relationships (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,          -- Can be Coach or Player
  relatedUserId INTEGER NOT NULL,   -- The family member
  relationship VARCHAR,             -- 'parent', 'child', 'sibling', 'guardian'
  verifiedBy INTEGER,               -- Admin who verified (can be NULL for self-declared)
  verifiedAt TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (relatedUserId) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE(userId, relatedUserId)  -- Prevent duplicate entries
);

-- Also create a coaches_children junction table for easier querying
CREATE TABLE coach_children (
  coachId INTEGER NOT NULL,
  childId INTEGER NOT NULL,          -- ID from children table
  relationship_verified BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (coachId, childId),
  FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (childId) REFERENCES children (id) ON DELETE CASCADE
);
```

**Pros**:
- Clear, queryable relationships
- Can track verification status
- Supports multiple relationship types
- Enables business logic (conflict checking, etc.)

**Cons**:
- Requires database migration
- Backend logic needs updating

---

### Solution 3: Unified Player Registry (Comprehensive)
**Create a central player entity that all roles reference**

```sql
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  userId INTEGER,                   -- NULL for children
  childId INTEGER,                  -- NULL for independent players
  firstName VARCHAR NOT NULL,
  lastName VARCHAR NOT NULL,
  dateOfBirth DATE,
  gender VARCHAR,
  preferredPosition VARCHAR,
  preferredTeamGender VARCHAR,
  
  -- Denormalized parent info for easier querying
  parentId INTEGER,                 -- Parent user ID (if child or coached child)
  coachId INTEGER,                  -- Coach parent ID (if coach has child)
  
  profilePicture VARCHAR,
  medicalInfo TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (childId) REFERENCES children (id) ON DELETE SET NULL,
  FOREIGN KEY (parentId) REFERENCES users (id) ON DELETE SET NULL,
  FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE SET NULL
);
```

**Pros**:
- Single source of truth for all players
- Unified availability/matching system
- Cleaner queries across roles

**Cons**:
- Major refactoring required
- Data migration complexity
- Higher risk

---

## Implementation Recommendation

**Phase 1: Family Relationships Table (Immediate)**
Minimal changes to support coaches with children:
1. Add `family_relationships` and `coach_children` tables
2. Update backend endpoints:
   - `POST /api/family-relationships` - declare relationship
   - `GET /api/family-relationships` - list family members
3. Add API logic to filter:
   - Children whose parent is a coach
   - Coaches who have children
4. Update dashboard to show family connections

**Phase 2: Conflict Detection (Medium term)**
1. When coach posts vacancy - show notice if their children could apply
2. When coach's child matches with coach's team - flag for review
3. When creating team, show family members already in same team

**Phase 3: Role Extension (Future)**
1. Migrate coaches with children to multi-role system
2. Unified notifications across roles
3. Simplified dashboard for coaches-with-kids

---

## Database Migration Steps (Phase 1)

```sql
-- Step 1: Create relationship tables
CREATE TABLE IF NOT EXISTS family_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  relatedUserId INTEGER NOT NULL,
  relationship TEXT NOT NULL,
  verifiedBy INTEGER,
  verifiedAt TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, relatedUserId),
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (relatedUserId) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coach_children (
  coachId INTEGER NOT NULL,
  childId INTEGER NOT NULL,
  relationshipVerified BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (coachId, childId),
  FOREIGN KEY (coachId) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (childId) REFERENCES children (id) ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_family_userId ON family_relationships(userId);
CREATE INDEX IF NOT EXISTS idx_family_relatedUserId ON family_relationships(relatedUserId);
CREATE INDEX IF NOT EXISTS idx_coachChildren_coachId ON coach_children(coachId);
CREATE INDEX IF NOT EXISTS idx_coachChildren_childId ON coach_children(childId);
```

---

## Implementation Checklist

### Backend Changes
- [ ] Add family relationship endpoints (GET, POST, DELETE)
- [ ] Add coach-child relationship endpoints
- [ ] Update children queries to check for coach-parent relationships
- [ ] Add verification logic for relationships
- [ ] Update match completion to track family relationships
- [ ] Add conflict detection logic

### Frontend Changes
- [ ] Add Family Relationships management page
- [ ] Show family connections in coach dashboard
- [ ] Show which coach is a parent in child management
- [ ] Add warnings when coach matches with their own child
- [ ] Update navigation to show family-related data

### Pages Affected
- [ ] Coach Dashboard - show children and their availability
- [ ] Children Management Page - show if child's parent is registered
- [ ] Team Management - show family members in roster
- [ ] Notifications - consolidate across family members

---

## Questions for Clarification

1. **Verification**: Should coach-child relationships be auto-verified (same family name, cross-reference) or manual admin approval?
2. **League Rules**: Are there specific rules about coaches having children in their teams?
3. **Notifications**: Should coaches get notified of their child's match completions?
4. **Team Limits**: Can a coach's child be the only player from their family on a team, or minimum 2?
5. **Age Groups**: Can coaches' children play in any age group, or restricted?

---

## Priority: HIGH
This feature gap affects:
- Coaches managing multiple players (common scenario)
- Data integrity (family relationships)
- System completeness for real-world usage
