# Safety System - Integration & Testing Guide

## Quick Start

### Step 1: Verify Backend Endpoints
All necessary endpoints are already implemented in `backend/server.js`:

```javascript
// Reporting endpoint
POST /api/messages/:messageId/report
// Admin retrieval endpoints  
GET /api/admin/message-reports
GET /api/admin/message-alerts
// Admin update endpoint
PUT /api/admin/message-reports/:reportId
```

### Step 2: Access the Moderation Dashboard

1. **Login as Admin**
   - Use admin account credentials
   - Navigate to admin area

2. **View Dashboard**
   - Click "Moderation" card (red gradient)
   - Or navigate directly to `/admin/moderation`

3. **Review Content**
   - Switch between "Reports" and "Keyword Alerts" tabs
   - Filter by status
   - Review individual items

---

## Testing Workflows

### Test 1: Create a Report

**Prerequisites**:
- Two user accounts (reporter and sender)
- Active message between them

**Steps**:
1. Login as reporter user
2. Navigate to messages
3. Click report icon on a message
4. Select reason (e.g., "Offensive Content")
5. Add optional details
6. Submit report

**Verification**:
- Report appears in admin moderation dashboard
- Status shows as "open"
- Reporter name and email are correct

### Test 2: Review and Update Report

**Prerequisites**:
- Open report in dashboard

**Steps**:
1. Login as admin
2. Navigate to `/admin/moderation`
3. Stay on "Reports" tab
4. Click "Review" button on a report
5. Dialog opens with report details
6. Change status (e.g., to "investigating")
7. Add moderator notes
8. Specify resolution action
9. Click "Save Changes"

**Verification**:
- Report status updates
- Notes are saved
- Dialog closes
- Report list refreshes

### Test 3: Keyword Alert Detection

**Prerequisites**:
- Keyword detection service running
- Message containing a monitored keyword

**Steps**:
1. Login as regular user
2. Send message with keyword (e.g., "This is spam content")
3. Message sends successfully
4. Login as admin
5. Go to `/admin/moderation`
6. Click "Keyword Alerts" tab
7. View alerts for that keyword

**Verification**:
- Alert appears in dashboard
- Keyword is highlighted
- Severity is correct
- Sender info is accurate

---

## Component Files Reference

### Frontend
```
src/pages/AdminModerationDashboard.tsx
├─ Tabs: Reports & Alerts
├─ Filters: Status-based filtering
├─ Tables: Paginated lists
├─ Dialog: Review/edit reports
└─ API Integration: Fetch & update data
```

### Backend
```
backend/server.js
├─ POST /api/messages/:messageId/report
├─ GET /api/admin/message-reports
├─ GET /api/admin/message-alerts
└─ PUT /api/admin/message-reports/:reportId
```

### Database
```
Database tables:
├─ message_reports
│  ├─ id (primary key)
│  ├─ messageId
│  ├─ reporterId
│  ├─ reason
│  ├─ details
│  ├─ status
│  ├─ moderatorNotes
│  ├─ resolutionAction
│  └─ timestamps
└─ message_alerts
   ├─ id (primary key)
   ├─ messageId
   ├─ keyword
   ├─ severity
   ├─ status
   └─ timestamp
```

---

## Common Scenarios

### Scenario 1: User Reports Harassment

1. User A receives aggressive messages from User B
2. User A reports messages with reason "Harassment"
3. Admin reviews report in dashboard
4. Admin updates status to "investigating"
5. Admin takes action (warns user, removes messages, etc.)
6. Admin updates report status to "resolved"

**Flow in Dashboard**:
- Reports tab → Filter by "open" → Review report → Update status/notes → Save

### Scenario 2: System Detects Spam Keywords

1. User C sends spam message
2. Keyword detector identifies spam keywords
3. Alert is created automatically
4. Admin reviews in Keyword Alerts tab
5. If valid: Update status to "reviewed" or take action
6. If false positive: Update status to "dismissed"

**Flow in Dashboard**:
- Keyword Alerts tab → Filter by "open" → Review alerts → Dismiss or review

### Scenario 3: Repeat Offender Pattern

1. User D has multiple reports over time
2. Admin reviews Reports tab
3. Admin filters by reporter to identify patterns
4. Admin notes escalation in moderator notes
5. Escalates from warning to suspension

**Flow in Dashboard**:
- Reports tab → Search/filter for user → Read moderator notes → Update escalation status

---

## API Request Examples

### Report a Message
```bash
POST /api/messages/msg123/report
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Offensive",
  "details": "Contains hate speech"
}
```

**Response**:
```json
{
  "success": true,
  "reportId": "rep456"
}
```

### Get Admin Reports
```bash
GET /api/admin/message-reports?status=open&limit=10&offset=0
Authorization: Bearer {token}
```

**Response**:
```json
{
  "reports": [
    {
      "id": "rep123",
      "messageId": "msg456",
      "reporterName": "John Doe",
      "reporterEmail": "john@example.com",
      "reason": "Offensive",
      "message": "Reported message content",
      "status": "open",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 15
}
```

### Update Report Status
```bash
PUT /api/admin/message-reports/rep123
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "resolved",
  "moderatorNotes": "User was warned about policy violations",
  "resolutionAction": "User warned - first violation"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Report updated successfully"
}
```

---

## Troubleshooting

### Issue: Reports not appearing

**Possible Causes**:
1. Report endpoint not responding
2. User not authenticated
3. Message ID is invalid
4. Database not storing reports

**Solution**:
1. Check browser console for API errors
2. Verify auth token in localStorage
3. Check that message exists in database
4. Check server logs for database errors

### Issue: Keyword alerts not showing

**Possible Causes**:
1. Keyword detection service not running
2. Keywords not in detection list
3. Alert endpoint returning error
4. Database not storing alerts

**Solution**:
1. Verify keyword-detection.js is loaded
2. Check keyword list configuration
3. Check browser network tab for API response
4. Review server logs

### Issue: Admin can't access dashboard

**Possible Causes**:
1. User role not set to "Admin"
2. Route protection blocking access
3. Authentication token expired

**Solution**:
1. Verify user role in database
2. Check ProtectedRoute component
3. Re-login to refresh token

---

## Performance Considerations

### Pagination
- Reports and alerts use pagination (10 per page)
- Improves dashboard load time
- Reduces database query load

### Filtering
- Status filtering reduces data transfer
- Only relevant items loaded
- Admins can focus on urgent items

### Optimization Tips
- Review high-severity alerts first
- Use status filters to narrow scope
- Archive old resolved reports periodically
- Monitor database growth

---

## Future Enhancements

### Phase 2 Features
1. **Bulk Actions**: Select multiple reports, apply same action
2. **Search**: Full-text search in reports/alerts
3. **Analytics**: Charts showing report trends
4. **Notifications**: Real-time alerts for high-severity reports
5. **Appeals**: Users can appeal moderation decisions
6. **Auto-Actions**: Automatic warnings and suspensions

### Phase 3 Features
1. **Content Removal**: Delete reported messages
2. **User Suspension**: Automatic account suspension
3. **Escalation Rules**: Configure auto-actions
4. **Custom Keywords**: Admin-defined keyword lists
5. **Audit Log**: Complete history of all actions
6. **Reports Export**: Export reports for analysis

---

## Support & Maintenance

### Regular Checks
- Review moderation dashboard daily
- Check for high-severity alerts immediately
- Track repeat offenders
- Monitor policy effectiveness

### Documentation
- Keep keyword lists updated
- Document resolution patterns
- Track policy changes
- Record decision precedents

### Community Health
- Communicate policies clearly
- Be consistent in enforcement
- Support user appeals process
- Maintain user privacy

---

## Deployment Checklist

- [ ] Backend endpoints tested
- [ ] Database tables created
- [ ] AdminModerationDashboard component added
- [ ] Route added to App.tsx
- [ ] Admin card added to AdminPage
- [ ] Icons imported
- [ ] Authentication working
- [ ] API calls responding
- [ ] Dashboard loads correctly
- [ ] Filters working
- [ ] Pagination working
- [ ] Update dialog working
- [ ] Documentation complete

---

## Quick Reference

**Access Point**: `/admin/moderation`
**Required Role**: Admin
**Tabs**: 
- Reports (user-submitted)
- Keyword Alerts (system-detected)

**Filters**: Status-based
**Actions**: 
- Review
- Update status
- Add notes
- Record action

**Statuses**:
- Reports: open, investigating, resolved, dismissed
- Alerts: open, reviewed, dismissed
