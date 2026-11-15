# InformationBank

A lightweight static website connected to Supabase.

## What's included
- Responsive InformationBank homepage
- Search, category filters, and article reading dialog
- Supabase tables for categories and articles
- Row Level Security: visitors can read categories and published articles; browser clients cannot create, edit, or delete content

## Supabase project
- Project URL: https://uiwzpapmsxqmvolknafk.supabase.co
- The Supabase publishable key is configured in index.html. It is intended for frontend use.
- Never put a Supabase secret key or service-role key in this repository.

## Run locally
Open index.html in a browser or serve this folder with any static web server.

## Publish with GitHub Pages
1. Open Settings → Pages in this repository.
2. Under Build and deployment, choose Deploy from a branch.
3. Select main and /(root), then save.
4. GitHub Pages will display the website URL after deployment.

## Add or edit articles
Use the Supabase Dashboard's Table Editor to add rows to public.articles and public.categories.
For an article to appear, category_id must reference an existing category, status must be published, and published_at should be set.
Content editing is intentionally kept in the Supabase Dashboard rather than exposed to anonymous visitors.
