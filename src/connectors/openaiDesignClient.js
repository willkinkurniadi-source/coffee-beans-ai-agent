import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const defaultImageModel = "gpt-image-1";

export function isOpenAIDesignConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateOpenAIDesignAsset(content) {
  const prompt = buildDesignPrompt(content);

  if (!isOpenAIDesignConfigured()) {
    return {
      generated: false,
      status: "blocked",
      message: "OPENAI_API_KEY belum diisi. Prompt desain sudah dibuat, image belum bisa digenerate.",
      design_prompt: prompt,
      image_url: content.url || ""
    };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || defaultImageModel,
      prompt,
      size: sizeForChannel(content.channel),
      quality: process.env.OPENAI_IMAGE_QUALITY || "medium",
      n: 1
    })
  });

  if (!response.ok) {
    return {
      generated: false,
      status: "failed",
      message: `OpenAI image generation failed: ${response.status} ${await response.text()}`,
      design_prompt: prompt,
      image_url: content.url || ""
    };
  }

  const payload = await response.json();
  const imageBase64 = payload.data?.[0]?.b64_json;
  if (!imageBase64) {
    return {
      generated: false,
      status: "failed",
      message: "OpenAI tidak mengembalikan b64_json image.",
      design_prompt: prompt,
      image_url: content.url || ""
    };
  }

  const publicPath = await saveGeneratedImage(content.content_id, imageBase64);
  return {
    generated: true,
    status: "generated",
    message: "OpenAI design image generated. Siap dipakai untuk upload Canva/social.",
    design_prompt: prompt,
    image_url: publicPath
  };
}

function buildDesignPrompt(content) {
  const channel = content.channel || "Instagram";
  const product = content.product_focus || "Single Origin Arabica";
  const hook = content.hook || content.brief || "";
  const caption = content.caption_draft || "";
  const visualBrief = content.visual_brief || "";

  return [
    "WILLKIN Coffee Roastery — Brand Guidelines v1.0",
    "",
    "BRAND IDENTITY:",
    "Premium Indonesian specialty coffee roastery. Established in Indonesia.",
    "Brand statement: Premium Indonesian Coffee, Built for the World.",
    "Tagline: Built Around Coffee.",
    "Personality: Sophisticated, Confident, Expert, Global, Premium, Minimal, Mature.",
    "NOT: Trendy cafe aesthetic, cartoonish, cheap-looking, too many elements.",
    "",
    "VISUAL DIRECTION — Cinematic · Warm · Textured · Authentic · Real. Natural. Premium.",
    "Photography style: cinematic product photography with warm, natural lighting.",
    "Color palette: Deep Coffee Brown (#2A1F17), Soft White (#F8F7F4), Warm Cream (#ECE5DA), Gold Accent (#B7925C).",
    "Composition: minimal, clean, intentional negative space. One hero element per frame.",
    "Texture: matte packaging, roasted bean texture, natural linen or dark slate surfaces.",
    "Mood: quiet luxury — like a premium watch brand or a Michelin-starred restaurant ingredient photography.",
    "NO: gradient overlays, stock photo feel, Canva template look, busy backgrounds, decorative clutter.",
    "NO: fake logos, fake certifications, random brand names, misspelled text.",
    "",
    `CHANNEL: ${channel}`,
    buildChannelSpec(channel),
    "",
    `PRODUCT: ${product}`,
    hook ? `HOOK: ${hook}` : "",
    visualBrief ? `VISUAL BRIEF: ${visualBrief}` : "",
    caption ? `CAPTION CONTEXT: ${caption.slice(0, 300)}` : "",
    "",
    "OUTPUT: One polished, print-quality image. Hero composition. Brand-consistent. No text overlay unless specified in visual brief.",
  ].filter(Boolean).join("\n");
}

function buildChannelSpec(channel) {
  if (/tiktok/i.test(channel)) {
    return "FORMAT: 9:16 vertical. Mobile-first. Strong visual hook. Subject centered. Clean or blurred roastery background.";
  }
  if (/reels|story/i.test(channel)) {
    return "FORMAT: 9:16 vertical. Editorial, premium. Single product or texture shot. Minimal — let the product breathe.";
  }
  if (/carousel/i.test(channel)) {
    return "FORMAT: 1:1 square. Clean cream or white background. Product centered. Leave space for text overlay.";
  }
  return "FORMAT: 1:1 square. Studio packshot or lifestyle. Warm single key light. Product is hero. Dark or cream background.";
}

function sizeForChannel(channel = "") {
  if (/tiktok|reels|short|story/i.test(channel)) return "1024x1536";
  return "1024x1024";
}

async function saveGeneratedImage(contentId, imageBase64) {
  const safeId = String(contentId || Date.now()).replace(/[^a-z0-9_-]/gi, "-");
  const dir = join(process.cwd(), "public", "generated");
  await mkdir(dir, { recursive: true });
  const filename = `${safeId}.png`;
  await writeFile(join(dir, filename), Buffer.from(imageBase64, "base64"));
  return `/generated/${filename}`;
}
