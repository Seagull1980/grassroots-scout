# Registration 400 Error - Debugging Guide

## Quick Steps to Find the Real Error

### Step 1: Open DevTools Network Tab
1. Press **F12** to open Developer Tools
2. Click the **Network** tab
3. Clear existing logs (trash icon)
4. Keep DevTools open

### Step 2: Fill Registration Form
- Email: `test@example.com`
- First Name: `John`
- Last Name: `Doe`
- Role: **Coach**
- Password: `Test@1234` (must have uppercase, lowercase, number, special char)
- Confirm Password: `Test@1234`

### Step 3: Submit & Check Network Tab
1. Click "Create Account"
2. In the **Network** tab, look for the **POST** request to `api/auth/register`
3. **Click on it** to see details
4. Look at two tabs:
   - **Request** tab: Shows what data was SENT
   - **Response** tab: Shows what error came BACK

### Step 4: Share What You See
Look for these tabs in the Network request details:

**Request Tab:**
- Should show JSON with: email, firstName, lastName, role, password

**Response Tab:**
- Should show the 400 error details - THIS IS WHAT WE NEED!

## What the Response Might Show

If it says:
```json
{
  "errors": [
    { "msg": "Valid email is required", "param": "email" }
  ]
}
```
→ Email format is wrong

If it says:
```json
{
  "errors": [
    { "msg": "Password must be at least 6 characters", "param": "password" }
  ]
}
```
→ Password is too short (but validation says 8)

## Browser Console Logs
After submitting, also check the **Console** tab for any blue `[API Request]` or `[API Error Interceptor]` messages.

---

**Share the Network tab response JSON and Console logs!**
