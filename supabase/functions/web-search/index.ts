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
const restrictedTokenHashes = new Set(["3e352725","43acec62","e7ce5979","f3d62abe","ed3f10aa","298304b4","20408545","ca991591","d0fd72c6","d988d8fd","006ce78a","7183f6da","8b77447b","669d97ad","6816127a","ac3d51c4","db87a315","ce1ad479","3b96486a","6f332041","3f7baeb6","9319fbea","f22dd82f","9a2b98d4","c5165534","422cd41b","bba85cda","ed3fa7b8","50a77a47","2ba55fdc","4439e890","ced1d9fb","614b509a","b20eaef6","b86f8b2f","b39861d4","549442f3","a564af80","762d041d","0c011e1a","524b9b4a","a1bcbcd0","ab30a69a","3c08ca24","018d55a9","f1f2c68a","95cc7561","e2dc4b56","4603a4f3","00e7903e","1ba8a9c0","cf295148","e76392cf","fdbffdf4","91e43548","119be83a","cca4340f","68e79149","07355e7b","23d82baf","3042569d","645ba277","edc36a07","f1fe9ddb","20ba6cb9","483325bf","f9088543","e6137ba3","00abe870"]);
function containsRestrictedTopic(query: string) {
  const tokens = query.toLocaleLowerCase().normalize("NFKC").match(/[a-z0-9]+/g) || [];
  return tokens.some(token => restrictedTokenHashes.has((() => {
    let hash = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  })()));
}

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
    if (containsRestrictedTopic(query)) {
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
