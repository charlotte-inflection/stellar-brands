# Milky Theme

Canonical source for the Milky Shopify theme. One codebase serves every environment
(staging, production, and seasonal campaign themes); environments differ by **theme
settings and product data**, not by forking the code.

- `assets/`, `sections/`, `snippets/`, `blocks/`, `templates/`, `config/`, `layout/`, `locales/`
  — standard Shopify Online Store 2.0 structure.
- Product model: three products — `milky-original`, `milky-ultra`, `nova` — each with
  **Color (sleeve) × Size** variants. Original and Ultra are linked on the PDP by a sibling switcher.

---

## 1. Prerequisites

```bash
# Shopify CLI (Node 20+)
npm install -g @shopify/cli@latest

# Verify
shopify version
git --version
```

You need: access to the Milky Shopify admin, a GitHub account with push access to this repo.

---

## 2. Branch → environment model

| Branch        | Shopify theme            | Purpose                                  |
|---------------|--------------------------|------------------------------------------|
| `production`  | Live theme               | What customers see. Protected.           |
| `staging`     | Unpublished staging theme| Validate changes before prod.            |
| `feature/*`   | (preview only)           | Local dev / PR previews.                 |

Flow: `feature/*` → PR → merge to `staging` (auto-deploys to staging theme) → validate →
merge `staging` → `production` (auto-deploys to live theme).

---

## 3. Deploy via the Shopify ↔ GitHub integration (routine deploys)

Connect each long-lived theme to its branch **once**, in the Shopify admin:

1. **Online Store → Themes → Add theme → Connect from GitHub.**
2. Authorize GitHub and pick this repository.
3. Connect the **staging** theme to the `staging` branch, and the **live** theme to the
   `production` branch.

After that, every push/merge to a connected branch auto-syncs to its theme — no CLI needed.

> **Important — two-way sync.** The integration also commits theme-editor changes (JSON
> templates, `config/settings_data.json`) **back** to the connected branch. So non-dev edits
> made in the editor on a connected theme land in Git. Pull before you start code work:
> ```bash
> git checkout staging && git pull
> ```
> Keep code (Liquid/JS/CSS) changes and marketer content (JSON settings) changes in separate
> commits/PRs to avoid conflicts.

---

## 4. Deploy / preview via Shopify CLI (local dev, previews, manual pushes)

```bash
# Authenticate against the store
shopify theme list --store milky-staging.myshopify.com

# Live local preview with hot reload (does not touch any live theme)
shopify theme dev --store milky-staging.myshopify.com

# Pull a theme's current settings/templates down (e.g. to capture editor changes)
shopify theme pull --store milky-staging.myshopify.com --theme <STAGING_THEME_ID>

# Push this working copy to a specific theme (manual deploy)
shopify theme push --store milky-staging.myshopify.com --theme <STAGING_THEME_ID>

# Push to a brand-new unpublished theme (e.g. a campaign theme)
shopify theme push --store milky.myshopify.com --unpublished --theme-name "Halloween 2026"
```

Find `<THEME_ID>` with `shopify theme list`. Replace the store domains with the real
staging / production `*.myshopify.com` handles.

---

## 5. Migration checklist — Combined Listings → 3 products

The target products already exist in admin as **unlisted** drafts with the correct
`Color × Size` structure. Run this on **staging** first, verify, then repeat on production.

1. **Publish** `milky-original`, `milky-ultra`, `nova` (set Active + sales channels on).
2. **Assign templates:** `milky-original` and `milky-ultra` → `product.milky`; `nova` → `product.nova`.
3. **Confirm Skio** selling-plan groups are attached to all three products.
4. **Validate the PDPs** (see §7) — sibling switch, variant switch, subscribe.
5. **Retire Combined Listings:** unpublish the parent `milky-card` (and `nova-card`) and the
   per-color child products (`milky-original-cosmic-black`, etc.).
6. **URL redirects** (Online Store → Navigation → URL Redirects): `/products/milky-card` and
   each retired child → the matching new product URL.
7. **Remove now-dead combined-listing code** (safe only after step 5, once no product uses the
   combined templates):
   - `templates/product.milky-combined.json`, `templates/product.nova-combined.json`
   - `snippets/combined-listing-picker.liquid`, `assets/combined-listing-swap.js`
   - The `cl_has_links` capture-phase block at the end of
     `snippets/product-variant-picker-swatch.liquid` (self-disabling on non-combined products,
     so removal is cosmetic — do it in its own commit).

---

## 6. Seasonality (Shopify Plus)

**Sleeves are variants, not themes.** Seasonal sleeves (e.g. `Limited Edition: Halloween`)
are `Color` option values on the three products. Use **variant publishing/unpublishing** to
turn a seasonal sleeve on or off — no catalog restructure, and the sibling/variant UX is unchanged.

**Letting marketers prep ahead without code risk — campaign themes.**
Keep the live theme connected to `production`. For a promotion, duplicate the live theme into an
**unpublished campaign theme** where marketers stage content/settings in the theme editor ahead of
time, then publish on schedule (or via a scheduled publish app). The campaign theme runs the same
code as prod (pull it from this repo with `shopify theme push --unpublished`); only JSON
settings/content differ. After the campaign, reconcile any keeper settings back into the repo with
`shopify theme pull`. This avoids a long-lived forked seasonal theme that drifts from main.

---

## 7. PDP verification

1. Load `/products/milky-original`, `/products/milky-ultra`, `/products/nova`. Color + Size
   pickers, price, gallery, and add-to-cart all work.
2. **Skio:** exactly one clean set of frequencies (no duplicates); Subscribe adds the correct
   selling plan; changing Color/Size keeps the picker mounted and tracking the selected variant.
3. **Sibling switch:** Original ⇄ Ultra is near-instant with a smooth transition. In Chromium
   DevTools → Application → *Speculative loads* you should see the sibling prerendered; the morph
   runs via cross-document View Transitions. Other browsers fall back to a normal navigation.
4. **Subscription continuity:** with a subscription selected, switch sibling — it stays subscribed.
5. Retired URLs (`/products/milky-card`, old children) 301 to the new products.

### What changed in the theme (for reviewers)
- `snippets/skio-app-block.liquid` — de-combined: feeds Skio the real product + selected variant
  (correct product id), and drops the plan-dedup / remount glue that Combined Listings required.
- `snippets/sibling-speculation-rules.liquid` (new) — prerender + scoped cross-document View
  Transitions + subscription continuity for the Original ⇄ Ultra switch. Rendered only where a
  `sibling_picker` block exists.
