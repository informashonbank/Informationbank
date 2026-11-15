# InformationBank

A lightweight static website connected to Supabase.

## Live website

This repository is a project site owned by the GitHub account `informashonbank`.
Its default GitHub Pages address will be:

**https://informashonbank.github.io/Informationbank/**

The address `https://informationbank.github.io/` belongs to a different GitHub account/organization named `informationbank`; it cannot be assigned to this repository just by adding a CNAME file.

## What's included
- Responsive InformationBank homepage
- Search, category filters, and article reading dialog
- Supabase tables for categories and articles
- Row Level Security: visitors can read categories and published articles; browser clients cannot create, edit, or delete content

## Supabase project
- Project URL: https://uiwzpapmsxqmvolknafk.supabase.co
- The Supabase publishable key is configured in index.html. It is intended for frontend use.
- Never put a Supabase secret key or service-role key in this repository.

## GitHub Pages deployment
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the site whenever a commit is pushed to `main`.
4. Check the **Actions** tab for the deployment result. When successful, open the live URL above.

## Run locally
Open `index.html` in a browser or serve this folder with any static web server.

## Add or edit articles
Use the Supabase Dashboard's Table Editor to add rows to `public.articles` and `public.categories`.
For an article to appear, `category_id` must reference an existing category, `status` must be `published`, and `published_at` should be set.
Content editing is intentionally kept in the Supabase Dashboard rather than exposed to anonymous website visitors.
