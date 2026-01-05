# Google Maps API Setup Guide

This guide will help you resolve the `BillingNotEnabledMapError` and properly configure Google Maps for The Grassroots Hub.

## The Error

If you're seeing this error:
```
BillingNotEnabledMapError
https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error
```

This means Google Maps requires billing to be enabled for your project.

## Step-by-Step Solution

### 1. Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

### 2. Enable Billing (REQUIRED)

**This is the most important step to resolve the billing error:**

1. In the Google Cloud Console, navigate to **Billing**
2. Click **"Link a billing account"** or **"Create billing account"**
3. Follow the setup process:
   - Add a payment method (credit card)
   - Verify your account
   - Accept terms and conditions
4. Link the billing account to your project

**Note:** Google provides $200 in free credits for new accounts, which is more than enough for development and moderate usage.

### 3. Enable Required APIs

Navigate to **APIs & Services > Library** and enable these APIs:

1. **Maps JavaScript API** (Required for map display)
2. **Places API** (Required for location search)
3. **Geocoding API** (Required for address conversion)
4. **Geometry API** (Required for distance calculations)

For each API:
- Search for the API name
- Click on it
- Click **"Enable"**

### 4. Create API Key

1. Go to **APIs & Services > Credentials**
2. Click **"Create Credentials"** > **"API Key"**
3. Copy the generated API key

### 5. Configure API Key Restrictions (Recommended)

To secure your API key:

1. Click on your newly created API key
2. Under **"API restrictions"**, select **"Restrict key"**
3. Choose the APIs you enabled in step 3
4. Under **"Website restrictions"**:
   - Select **"HTTP referrers"**
   - Add these referrers:
     ```
     http://localhost:*/*
     https://localhost:*/*
     http://127.0.0.1:*/*
     https://127.0.0.1:*/*
     https://yourdomain.com/*
     ```
   - Replace `yourdomain.com` with your actual domain

### 6. Add API Key to Your Project

1. Open your `.env` file in the project root
2. Update the API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
3. Save the file
4. Restart your development server

## Cost Information

Google Maps pricing is usage-based:

- **Maps JavaScript API**: $7 per 1,000 map loads
- **Places API**: $17 per 1,000 requests
- **Geocoding API**: $5 per 1,000 requests

**Free tier:** Google provides $200 monthly credit, which covers:
- ~28,500 map loads per month
- ~11,700 Places API requests per month
- ~40,000 Geocoding requests per month

For a development project, you're unlikely to exceed these limits.

## Troubleshooting

### Still Getting Billing Error?

1. **Wait 5-10 minutes** after enabling billing - changes can take time to propagate
2. **Clear browser cache** and refresh the page
3. **Check your project**: Ensure you're using the correct Google Cloud project
4. **Verify APIs are enabled**: Double-check all required APIs are enabled
5. **Check API key**: Ensure it's correctly added to the `.env` file

### API Key Not Working?

1. **Check restrictions**: Make sure localhost is allowed if you have referrer restrictions
2. **Verify APIs**: Ensure all required APIs are enabled for your key
3. **Check quotas**: Look at APIs & Services > Quotas to see if you've hit limits

### Development vs Production

For **development** (localhost):
- Minimal restrictions needed
- Use HTTP referrer restrictions with localhost patterns

For **production**:
- Restrict to your specific domain
- Monitor usage in Google Cloud Console
- Set up billing alerts

## Testing Your Setup

After completing the setup:

1. Restart your development server
2. Navigate to the Maps page in your application
3. You should see the map load without errors
4. Try drawing a custom search area to test full functionality

## Additional Resources

- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)
- [Google Cloud Billing Documentation](https://cloud.google.com/billing/docs)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)

## Support

If you continue to have issues after following this guide:

1. Check the browser console for specific error messages
2. Verify your billing account is active in Google Cloud Console
3. Ensure all required APIs show as "enabled" in your project
4. Try creating a new API key if the current one isn't working

The map functionality should work perfectly once billing is properly configured!