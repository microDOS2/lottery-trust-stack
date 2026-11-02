# Lottery Trust Stack

A personal planning model for lottery winners: structure a 4-entity trust stack, generate tax-free income, and keep compounding for 25 years.

**Educational math model — not tax, legal, or financial advice.** Figures use approximate 2026 federal/state rates. Run everything past a licensed attorney and CPA before acting.

## What's inside

- **Calculator** — the original dashboard, rebuilt: prize → taxes → 4-entity stack (Master Trust reserves, DAPT with muni ladder + direct-indexed equities, PPLI trust, anonymous WY LLC). Verified 2026 rates, corrected 25-year projection, and a taxable-baseline comparison that isolates what the structure is worth.
- **Income ↔ Growth dial** — reallocates the core between income engines and growth engines; the frontier chart shows the tradeoff across every dial position.
- **Strategy Library** — plain-English cards: the three engines plus buy-borrow-die leverage, Opportunity Zones (OZ 2.0), QSBS, the $15M dynasty-trust layer, and CRTs/DAFs — each with eligibility, mechanics, and watch-outs.
- **Annuity vs Lump Sum** — 30-year graduated-annuity vs. cash-option-invested, with the honest answer to "which wins" and when it flips.
- **First-Year Guide + Glossary** — the claim-to-month-13 roadmap and every term translated.

## Run it

```bash
npm install
npm run dev      # local dev
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

## Deploy to GitHub Pages

GitHub Pages serves static files, and this app's production build (`dist/`) is fully static.

Easiest path — **GitHub Actions** (free, automatic on every push):

1. In the repo: **Settings → Pages → Source → GitHub Actions**.
2. Commit this workflow as `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
permissions:
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

3. Push. Your site appears at `https://<username>.github.io/lottery-trust-stack/`.

> **Note:** Pages on a *private* repo requires GitHub Pro. Either make the repo public (it contains no secrets), or keep it private and share the built `dist/` with friends directly.

The Vite config uses `base: './'`, so the build works from any subpath (project pages, a custom domain, or a friend's desktop) with no extra setup.

## Data & privacy

Everything runs in your browser. Scenarios save to `localStorage` (this browser only — clearing site data erases them). The "Copy shareable link" button encodes your inputs into the URL hash so a setup can be shared with a friend; nothing is sent anywhere.

## Tech

React 19 + TypeScript + Vite + Tailwind + shadcn/ui + Recharts. No backend, no accounts, no tracking.
