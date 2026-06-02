export async function scrapeCafeLeads({ city, keyword = "cafe coffee shop", limit = 10 }) {
  if (!process.env.SCRAPER_API_URL || !process.env.SCRAPER_API_TOKEN) {
    return {
      mocked: true,
      leads: [
        {
          lead_id: `MOCK-${Date.now()}`,
          nama_cafe: `Contoh Cafe ${city}`,
          kota: city,
          segment: "coffee shop",
          has_espresso: "yes",
          lead_source: "mock_scraper",
          fit_notes: `Mock lead untuk keyword ${keyword}`
        }
      ]
    };
  }

  const url = new URL(process.env.SCRAPER_API_URL.replace(/\/$/, "") + "/google-maps-search");
  url.searchParams.set("query", `${keyword}, ${city}, Indonesia`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("async", "false");
  url.searchParams.set("language", "id");
  url.searchParams.set("region", "ID");
  url.searchParams.set("fields", [
    "name",
    "full_address",
    "city",
    "site",
    "phone",
    "rating",
    "reviews",
    "type",
    "subtypes",
    "google_id",
    "place_id",
    "location_link"
  ].join(","));

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": process.env.SCRAPER_API_TOKEN
    }
  });

  if (!response.ok) {
    throw new Error(`Scraper API error ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return {
    mocked: false,
    leads: normalizeOutscraperLeads(payload, city, keyword),
    raw: payload
  };
}

function normalizeOutscraperLeads(payload, city, keyword) {
  const rows = Array.isArray(payload?.data?.[0]) ? payload.data[0] : Array.isArray(payload?.data) ? payload.data : [];
  return rows.map((item) => ({
    lead_id: item.place_id || item.google_id || "",
    nama_cafe: item.name || "",
    kota: item.city || city || "",
    alamat: item.full_address || "",
    website: item.site || "",
    phone: item.phone || "",
    wa_number: item.phone || "",
    segment: [item.type, ...asArray(item.subtypes)].filter(Boolean).join(", ") || "cafe",
    google_maps_url: item.location_link || "",
    lead_source: "outscraper_google_maps",
    fit_notes: `Keyword: ${keyword}. Rating ${item.rating || "-"} dari ${item.reviews || 0} reviews.`
  }));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}
