# Cloudflare API Proxy Setup

This project is now prepared to stop exposing the raw Railway backend in the browser.

## Target Shape

- Frontend: Vercel on `https://www.grassroots-scout.co.uk`
- API: Cloudflare-proxied hostname `https://api.grassroots-scout.co.uk`
- Origin server: Railway backend service, using the healthy Railway service domain as the origin

## What Changed In Code

- Client-side fallback URLs no longer hardcode the raw Railway hostname.
- The Vercel repo config no longer bakes a backend origin into `VITE_API_URL`.
- Production backend env examples now include `CORS_ALLOWED_ORIGINS`.

## Cloudflare Setup

1. Create or choose your zone in Cloudflare.
2. Add a DNS record for `api` that points to the Railway service domain: `grassroots-scout-backend-production-7b21.up.railway.app`.
3. Enable the proxy for that DNS record so it shows the orange cloud.
4. Turn on rate limiting and managed WAF rules for `api.grassroots-scout.co.uk`.
5. If available on your plan, enable bot protection for the API hostname.
6. If you already created a Railway custom domain and it still returns a Railway `502` or `Application failed to respond`, do not rely on it for the Cloudflare cutover.

## Railway Setup

1. In Railway, confirm the backend service is healthy on the Railway service domain.
2. Set backend environment variables:

```env
FRONTEND_URL=https://www.grassroots-scout.co.uk
CORS_ALLOWED_ORIGINS=https://grassroots-scout.co.uk,https://www.grassroots-scout.co.uk
```

3. Redeploy the Railway service after updating env vars.

If you do want to keep a Railway custom domain for convenience, make sure it resolves cleanly on its own before pointing Cloudflare at it. The safer production setup is to proxy Cloudflare directly to the working Railway service domain.

## Vercel Setup

Set the frontend build environment variable in the Vercel project:

```env
VITE_API_URL=https://api.grassroots-scout.co.uk
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
2. Confirm API requests go to `https://api.grassroots-scout.co.uk` in the browser network tab.
3. Confirm no browser requests go directly to `*.up.railway.app`.
4. Confirm login, profile loading, messages, maps, and admin pages still work.
5. Confirm email links point to `FRONTEND_URL`.