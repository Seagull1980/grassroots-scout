# Cloudflare API Proxy Setup

This project is now prepared to stop exposing the raw Railway backend in the browser.

## Target Shape

- Frontend: Vercel on your main site domain, for example `https://www.yourdomain.com`
- API: Cloudflare-proxied custom hostname, for example `https://api.yourdomain.com`
- Origin server: Railway backend service hidden behind Cloudflare

## What Changed In Code

- Client-side fallback URLs no longer hardcode the raw Railway hostname.
- The Vercel repo config no longer bakes a backend origin into `VITE_API_URL`.
- Production backend env examples now include `CORS_ALLOWED_ORIGINS`.

## Cloudflare Setup

1. Create or choose your zone in Cloudflare.
2. Add a DNS record for `api` that points to your Railway backend custom domain target.
3. Enable the proxy for that DNS record so it shows the orange cloud.
4. Turn on rate limiting and managed WAF rules for `api.yourdomain.com`.
5. If available on your plan, enable bot protection for the API hostname.

## Railway Setup

1. In Railway, add a custom domain for the backend service.
2. Use a hostname that Cloudflare can target as the origin.
3. Set backend environment variables:

```env
FRONTEND_URL=https://www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

4. Redeploy the Railway service after updating env vars.

## Vercel Setup

Set the frontend build environment variable in the Vercel project:

```env
VITE_API_URL=https://api.yourdomain.com
```

After setting the variable, redeploy Vercel.

## Why This Is Safer

- Browsers call the Cloudflare hostname instead of the raw Railway hostname.
- The frontend bundle no longer ships the Railway production URL by default.
- Cloudflare can absorb and challenge abusive traffic before it reaches billable backend compute.

## Important Limitation

Cloudflare helps only if clients stop using the raw origin. After cutover, avoid exposing the Railway hostname in client code, docs, or public config. Keep backend rate limiting enabled as a second layer.

## Verification Checklist

1. Open the app in production.
2. Confirm API requests go to `https://api.yourdomain.com` in the browser network tab.
3. Confirm no browser requests go directly to `*.up.railway.app`.
4. Confirm login, profile loading, messages, maps, and admin pages still work.
5. Confirm email links point to `FRONTEND_URL`.