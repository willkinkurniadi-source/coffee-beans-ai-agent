/**
 * Content Agent — WILLKIN Coffee Roastery
 * Brand Guidelines v1.0
 *
 * Tone: Luxury watch brand + Professional roastery
 * Colors: #2A1F17 · #F8F7F4 · #ECE5DA · #B7925C
 * Photography: Cinematic · Warm · Textured · Authentic — Real. Natural. Premium.
 * Personality: Sophisticated · Confident · Expert · Global · Premium · Minimal · Mature
 */

const BRAND = {
  name: "WILLKIN Coffee Roastery",
  tagline: "Built Around Coffee",
  origin: "Indonesia",
  tone: "Sophisticated, confident, and precise. Never casual or hype-driven.",
  visualStyle: "Cinematic, warm, textured, authentic. Real. Natural. Premium.",
  cta_sample: "Request sample",
  cta_price: "Request price list",
  cta_dm: "DM for wholesale inquiry",
};

export function generateContentPlan(products, brandVoice) {
  const coffeeProducts = products.filter(isCoffeeBeanProduct);
  const product =
    coffeeProducts.find((p) => /classic blend|house blend|espresso blend/i.test(p.nama_produk || "")) ||
    coffeeProducts.find((p) => p.priority_to_sell === "high") ||
    coffeeProducts[0] ||
    {};

  const name = product.nama_produk || "Single Origin Gayo Arabica";
  const origin = product.origin || product.asal || "Aceh Gayo, Indonesia";
  const process = product.process || product.proses || "Honey Process";
  const notes = product.flavor_notes || product.catatan_rasa || "dark chocolate, brown sugar, clean finish";
  const roast = product.roast_level || "Medium";

  return {
    brandVoice: BRAND.tone,
    product_focus: name,
    content_items: [
      buildInstagramFeed({ name, origin, process, notes, roast }),
      buildInstagramReels({ name, notes }),
      buildInstagramCarousel({ name, origin, process, notes }),
      buildTikTokHero({ name, origin, notes }),
      buildTikTokEducation({ name, notes }),
      buildWhatsAppBroadcast({ name, notes }),
    ],
    ugc_owner_script: buildOwnerScript({ name, origin, notes }),
    feed_post: buildFeedPost({ name, notes }),
    story_sequence: buildStorySequence({ name, notes }),
    short_video_script: buildShortVideoScript({ name, origin, notes }),
    whatsapp_broadcast: buildWhatsAppText({ name, notes }),
  };
}

// ─── Instagram Feed ───────────────────────────────────────────────────────────

function buildInstagramFeed({ name, origin, notes }) {
  return {
    channel: "Instagram",
    content_type: "feed",
    objective: "brand_authority",
    product_focus: name,
    hook: `${origin}. Roasted for precision.`,
    caption: `Every origin has a character.\n\n${name} — sourced from ${origin}, roasted to preserve what the land gave it.\n\nNotes: ${notes}.\n\nFor cafes and buyers who understand that consistency is a craft, not a coincidence.\n\n${BRAND.cta_sample} → link in bio`,
    cta: "Request sample via link in bio",
    visual_brief: `Packshot ${name} on dark espresso linen. Single product, centered composition. Soft side lighting. No props. No text overlay. Cinematic, minimal — Real. Natural. Premium.`,
    hashtags: "#WillkinCoffee #SpecialtyCoffee #IndonesianCoffee #CoffeeRoastery #BuiltAroundCoffee",
  };
}

// ─── Instagram Reels ──────────────────────────────────────────────────────────

function buildInstagramReels({ name, notes }) {
  return {
    channel: "Instagram",
    content_type: "reels",
    objective: "reach_awareness",
    product_focus: name,
    hook: "Precision starts before the first shot.",
    caption: `Roast consistency is not a setting on the machine.\nIt starts at origin selection, green bean sorting, and roast profiling.\n\n${name} — ${notes}.\n\nWILLKIN Coffee Roastery · Built Around Coffee`,
    cta: "Save this post · DM for wholesale",
    script: buildReelsScript({ name, notes }),
    visual_brief: `B-roll sequence: green bean sorting → roast drum closeup → cooling tray → packaged ${name} on clean surface. Color grade: warm tones, high contrast. Audio: ambient roastery sound or minimal lo-fi instrumental. NO voiceover. Text overlays in serif, minimal — one phrase per cut.`,
    hashtags: "#WillkinCoffee #CoffeeRoastery #SpecialtyCoffeeIndonesia #BuiltAroundCoffee",
  };
}

// ─── Instagram Carousel ───────────────────────────────────────────────────────

function buildInstagramCarousel({ name, origin, process, notes }) {
  return {
    channel: "Instagram",
    content_type: "carousel",
    objective: "education_trust",
    product_focus: name,
    hook: `What makes ${name} different.`,
    caption: `Not every roastery traces this far back.\n\nSwipe to understand what goes into ${name} — from ${origin} to your espresso machine.\n\nWILLKIN Coffee Roastery · Built Around Coffee`,
    cta: "DM for price list and sample",
    slides: [
      { slide: 1, headline: `${name}`, subtext: `Origin: ${origin}` },
      { slide: 2, headline: "Process", subtext: `${process} — controlled fermentation for clean, structured sweetness.` },
      { slide: 3, headline: "Flavor Profile", subtext: notes },
      { slide: 4, headline: "Roast Philosophy", subtext: "Every batch roasted to highlight origin character — not to mask it." },
      { slide: 5, headline: "For Cafes & Buyers", subtext: "Stable supply. Consistent roast profile. No surprises." },
      { slide: 6, headline: "Request a Sample", subtext: "DM us or visit link in bio." },
    ],
    visual_brief: `Slide 1: product packshot full bleed. Slides 2-5: clean white background, serif typography, single ingredient/detail photo per slide. Slide 6: brand lockup on cream background. Warm, minimal, editorial.`,
  };
}

// ─── TikTok Hero ─────────────────────────────────────────────────────────────

function buildTikTokHero({ name, origin, notes }) {
  return {
    channel: "TikTok",
    content_type: "short_video",
    objective: "lead_generation",
    product_focus: name,
    hook: "Most cafes don't know where their beans are from. We do.",
    caption: `${name} from ${origin}.\nNotes: ${notes}.\n\nFor cafes that care about what they serve.\n\nComment SAMPLE or DM for wholesale inquiry.\n\n${BRAND.tagline} · WILLKIN Coffee Roastery`,
    cta: "Comment SAMPLE",
    script: buildTikTokScript({ name, origin, notes }),
    visual_brief: `Owner/roaster talking head — confident, direct, no smile-forced delivery. Background: roastery floor or packaging area. Lighting: warm, single key light. Subtitles: clean serif, centered, lowercase. Cut to: beans closeup, origin label, espresso shot. 20-30 seconds total.`,
  };
}

// ─── TikTok Education ─────────────────────────────────────────────────────────

function buildTikTokEducation({ name, notes }) {
  return {
    channel: "TikTok",
    content_type: "education_video",
    objective: "brand_authority",
    product_focus: name,
    hook: "Why your espresso tastes different every morning — and how to fix it.",
    caption: `Inconsistency in the cup is rarely a machine problem.\n\nIt starts with the beans.\n\n${name} — roasted for stability and calibration consistency.\nNotes: ${notes}.\n\nFor cafes that can't afford a bad cup. DM for wholesale.\n\nWILLKIN Coffee Roastery`,
    cta: "Follow for more · DM for price list",
    script: [
      "Hook (0-3s): Your espresso tastes different every morning. Here's why.",
      "Problem (3-10s): Most roasters optimize for flavor over stability. Cafes pay the price.",
      `Solution (10-20s): ${name} is roasted with a fixed profile — same result, every batch.`,
      `Proof (20-27s): Notes: ${notes}. Easy to calibrate. Stable supply.`,
      "CTA (27-30s): DM WHOLESALE or comment SAMPLE.",
    ].join("\n"),
    visual_brief: `Fast cuts: espresso pulling inconsistently → barista adjusting grinder frustrated → WILLKIN beans packshot → clean espresso shot. Text-on-screen style (a la @businessfashion). Warm tones. Confident, no humor.`,
  };
}

// ─── WhatsApp Broadcast ───────────────────────────────────────────────────────

function buildWhatsAppBroadcast({ name, notes }) {
  return {
    channel: "WhatsApp",
    content_type: "broadcast",
    objective: "sample_request",
    product_focus: name,
    hook: `${name} — ready for your review.`,
    caption: `Good morning,\n\nWe currently have ${name} available for wholesale sampling.\n\nFlavor profile: ${notes}.\nSuitable for espresso-based and filter applications.\n\nIf you'd like to evaluate a 300g sample before committing to a recurring order, we're happy to arrange that.\n\nReply with your cafe name and we'll send the details.\n\nWILLKIN Coffee Roastery\n${BRAND.tagline}`,
    cta: "Reply with cafe name",
    visual_brief: "Packshot with clean background. No promotional graphics.",
  };
}

// ─── Scripts ──────────────────────────────────────────────────────────────────

function buildReelsScript({ name, notes }) {
  return [
    "Cut 1 (0-2s): Green beans — sorted by hand. Text: 'It starts here.'",
    "Cut 2 (2-6s): Roast drum, beans tumbling. Text: 'Controlled heat. Precise timing.'",
    "Cut 3 (6-10s): Cooling tray, steam rising. Text: 'Every batch tracked.'",
    `Cut 4 (10-15s): Packshot ${name}. Text: '${notes}'`,
    "Cut 5 (15-18s): Brand lockup. Text: 'WILLKIN Coffee Roastery · Built Around Coffee'",
  ].join("\n");
}

function buildTikTokScript({ name, origin, notes }) {
  return [
    `Hook (0-3s): [Direct to camera] "Most cafes don't know where their beans are from. We do."`,
    `Origin (3-10s): "${name}, sourced from ${origin}. Traceable. Consistent. Roasted in-house."`,
    `Profile (10-18s): "Notes: ${notes}. Built for espresso-based menus that need stability every day."`,
    `Offer (18-25s): "If you're sourcing for a cafe or looking to upgrade your current supplier — comment SAMPLE."`,
    `Close (25-30s): [Brand card] "WILLKIN Coffee Roastery. Built Around Coffee."`,
  ].join("\n");
}

function buildOwnerScript({ name, origin, notes }) {
  return {
    title: `${name} — Why origin matters for your cafe`,
    duration_seconds: 30,
    talking_points: [
      `${name} is sourced from ${origin} — fully traceable.`,
      `Flavor: ${notes}. Roast profile built for daily espresso consistency.`,
      "We offer 300g samples for cafes before recurring orders.",
    ],
    teleprompter: `${name} comes from ${origin}. We selected this lot specifically for cafes that need a reliable daily driver — something that pulls consistently without constant adjustment. The flavor profile is ${notes}. If you're evaluating a new supplier, we'll send a 300g sample before any commitment. Just reach out.`,
  };
}

function buildFeedPost({ name, notes }) {
  return {
    hook: `${name}. Sourced with intention. Roasted with precision.`,
    caption: `When an origin is this expressive, the roaster's job is to stay out of the way.\n\nNotes: ${notes}.\n\nAvailable for wholesale. Request sample via link in bio.\n\nWILLKIN Coffee Roastery · Built Around Coffee`,
    cta: "Request sample via link in bio",
  };
}

function buildStorySequence({ name, notes }) {
  return [
    `Frame 1: [Product close-up] "${name}" in serif. Minimal white background.`,
    `Frame 2: [Flavor notes] "${notes}" — one line, centered.`,
    `Frame 3: [CTA] "Wholesale inquiry → swipe up" or "DM for sample"`,
  ];
}

function buildShortVideoScript({ name, origin, notes }) {
  return [
    `Opening: [Packshot cut] "${name} — ${origin}."`,
    `Middle: "Roasted for cafes that need consistency, not just flavor."`,
    `Profile: "Notes: ${notes}. Available in wholesale quantities."`,
    `Close: "DM for price list and sample. WILLKIN Coffee Roastery."`,
  ];
}

function buildWhatsAppText({ name, notes }) {
  return `Good morning,\n\n${name} is available this week for wholesale evaluation.\n\nFlavor: ${notes}.\n\nReply with your cafe name to receive the price list and sample details.\n\nWILLKIN Coffee Roastery`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCoffeeBeanProduct(item) {
  const text = `${item.nama_produk || ""} ${item.product_name || ""} ${item.jenis || ""} ${item.category || ""}`;
  return (
    /coffee|kopi|beans|bean|robusta|arabica|blend|espresso|gayo|kintamani|preanger/i.test(text) &&
    !/packaging|pouch|bag|sticker|label/i.test(text)
  );
}
