# MyFeedbackPage Crash Fix

## Issue
MyFeedbackPage was crashing with error: "Cannot read properties of undefined (reading 'length')"
- Error occurred when page tried to render feedback submissions
- Frontend code attempted to call `.map()` on undefined feedback array

## Root Cause
**Missing Backend Endpoints:**
- User feedback endpoints (`/api/feedback/my-submissions`, `/api/feedback/:id`, `/api/feedback/:id/comments`) only existed in `team-roster-server.js`
- `team-roster-server.js` runs locally on port 3004 but is NOT deployed to Railway
- Production backend (`server.js`) only had admin feedback endpoints (`/api/admin/feedback/*`)
- Result: Frontend API calls returned 404, `response.data.feedback` was undefined

**Lack of Null Safety:**
- Frontend code: `setFeedback(response.data.feedback)` - no null check
- When API call failed, state was set to `undefined`
- Rendering code called `feedback.map()` which crashed

## Solution

### Backend Changes (`backend/server.js`)
Integrated three user feedback endpoints from `team-roster-server.js`:

1. **GET /api/feedback/my-submissions**
   - Returns authenticated user's feedback submissions
   - Includes comment count for each feedback item
   - Order by creation date (newest first)

2. **GET /api/feedback/:feedbackId**
   - Returns specific feedback with all comments
   - Access control: Only feedback owner or admin can view
   - Joins with users table for user details

3. **POST /api/feedback/:feedbackId/comments**
   - Add comment to existing feedback
   - Access control: Only feedback owner or admin can comment
   - Tracks admin vs user comments (`isAdminComment` flag)
   - Updates feedback `updatedAt` timestamp

**Database Compatibility:**
- All required tables (`user_feedback`, `feedback_comments`) already initialized in server.js startup
- Column names adapted to PostgreSQL conventions (lowercase: `userid`, `feedbackid`, `createdat`, etc.)
- Proper JOIN queries with users table for user information

### Frontend Changes (`src/pages/MyFeedbackPage.tsx`)
1. **Null Safety:**
   - Changed: `setFeedback(response.data?.feedback || [])`
   - Changed: `setComments(response.data?.comments || [])`
   - Ensures state is always an array, never undefined

2. **API Path Updates:**
   - Changed: `/feedback/my-submissions` → `/api/feedback/my-submissions`
   - Changed: `/feedback/:id` → `/api/feedback/:id`
   - Changed: `/feedback/:id/comments` → `/api/feedback/:id/comments`
   - Ensures routes match Vercel proxy configuration (`/api/*` → Railway backend)

## Technical Details

### API URL Configuration
- **Production (Vercel):** `ROSTER_API_URL = ''` (empty string)
  - Uses relative URLs: `/api/feedback/...`
  - Vercel proxy forwards to Railway backend
- **Development:** `VITE_ROSTER_API_URL = http://localhost:3004`
  - Direct connection to local team-roster-server

### Authentication & Authorization
- All endpoints require JWT authentication (`authenticateToken` middleware)
- Access control enforced at data level:
  - Users can only view/comment on their own feedback
  - Admins can view/comment on all feedback
- Admin comments flagged with `isAdminComment: true`

### Database Schema
```sql
-- user_feedback table
CREATE TABLE user_feedback (
  id SERIAL PRIMARY KEY,
  userid INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'normal',
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userid) REFERENCES users(id)
);

-- feedback_comments table
CREATE TABLE feedback_comments (
  id SERIAL PRIMARY KEY,
  feedbackid INTEGER NOT NULL,
  userid INTEGER NOT NULL,
  comment TEXT NOT NULL,
  isadmincomment BOOLEAN DEFAULT FALSE,
  createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedbackid) REFERENCES user_feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (userid) REFERENCES users(id)
);
```

## Testing
After deployment, test the following:
1. **View Feedback List:** Navigate to `/my-feedback` - should load without crash
2. **Submit Feedback:** Create new feedback via feedback form
3. **View Details:** Click on feedback item - should show comments
4. **Add Comment:** Add comment to own feedback - should update
5. **Admin View:** Login as admin - should see admin-specific UI

## Deployment
- Backend changes deployed to Railway (server.js)
- Frontend changes deployed to Vercel
- No database migrations needed (tables already existed)
- No environment variable changes needed

## Related Commits
- Commit `a6f9057`: MyFeedbackPage fix with endpoint integration and null safety

## Related Issues Fixed Previously
- Forum endpoints integration (commits 01f8988, 335bdf2, 1786994)
- Admin feedback endpoints (commits fe076fa, 2172a4a)
- Analytics endpoints (commit fe076fa)
- Match completions admin access (commit 865dae0)

All followed same pattern: Features existed in team-roster-server.js but not in deployed server.js
