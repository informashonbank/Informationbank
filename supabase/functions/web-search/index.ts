const corsHeaders = {
  "Access-Control-Allow-Origin": "https://informashonbank.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};

const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
});

// Keep searches focused on age-appropriate, non-harmful information.
const restrictedQuery = /\b(?:guns?|firearms?|ammunition|explosives?|bombs?|grenades?|knives?|switchblades?|tasers?|pepper\s*spray|weapons?|weaponizing|opioids?|fentanyl|cocaine|heroin|methamphetamine|vapes?|nicotine|marijuana|cannabis|thc|recreational\s+drugs?|steroids?|gambling|sports\s+betting|online\s+casino|prediction\s+markets?|roulette|poker\s+for\s+money|dangerous\s+challenge|choking\s+challenge|blackout\s+challenge)\b/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);

  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const publishableKey = keys.default || "";
    if (!publishableKey || req.headers.get("apikey") !== publishableKey) {
      return reply({ error: "Not authorized." }, 401);
    }

    const braveKey = (Deno.env.get("BRAVE_SEARCH_API_KEY") || "").trim();
    if (!braveKey) {
      return reply({
        configured: false,
        error: "Web search is almost ready. The site owner needs to add the BRAVE_SEARCH_API_KEY secret in Supabase before web results can appear."
      }, 503);
    }

    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim().replace(/\s+/g, " ") : "";
    if (query.length < 2 || query.length > 200 || query.split(/\s+/).length > 32) {
      return reply({ error: "Enter a search between 2 and 200 characters." }, 400);
    }
    if (restrictedQuery.test(query)) {
      return reply({
        error: "This search is not available. InformationBank web search is designed for age-appropriate, educational topics."
      }, 403);
    }

    const endpoint = new URL("https://api.search.brave.com/res/v1/web/search");
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("count", "8");
    endpoint.searchParams.set("country", "US");
    endpoint.searchParams.set("search_lang", "en");
    endpoint.searchParams.set("safesearch", "strict");

    const upstream = await fetch(endpoint, {
      headers: { "Accept": "application/json", "X-Subscription-Token": braveKey },
      signal: AbortSignal.timeout(12000)
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Brave Search API error:", upstream.status, detail.slice(0, 300));
      if (upstream.status === 401 || upstream.status === 403) {
        return reply({ error: "The web search provider key needs to be checked by the site owner." }, 502);
      }
      if (upstream.status === 429) {
        return reply({ error: "Web search is busy right now. Please wait a moment and try again." }, 429);
      }
      return reply({ error: "The web search provider could not complete that search. Please try again." }, 502);
    }

    const data = await upstream.json();
    const results = (Array.isArray(data.web?.results) ? data.web.results : [])
      .slice(0, 8)
      .flatMap((item: any) => {
        try {
          const url = new URL(String(item.url || ""));
          if (url.protocol !== "https:" && url.protocol !== "http:") return [];
          return [{
            title: String(item.title || "Untitled result").slice(0, 240),
            url: url.href,
            description: String(item.description || "").replace(/<[^>]*>/g, "").slice(0, 700),
            domain: url.hostname.replace(/^www\./, ""),
            age: String(item.page_age || item.age || "").slice(0, 80)
          }];
        } catch {
          return [];
        }
      });

    return reply({ configured: true, query, results, total: results.length });
  } catch (error) {
    console.error("Web search function error:", error);
    return reply({ error: "Web search ran into a temporary problem. Please try again." }, 500);
  }
});
