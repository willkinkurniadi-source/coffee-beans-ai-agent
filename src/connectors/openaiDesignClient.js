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
  const product = content.product_focus || "Roasted Beans - House Blend";
  const hook = content.hook || content.brief || "Coffee beans stabil untuk cafe";
  const caption = content.caption_draft || "";
  const cta = content.cta || "DM SAMPLE";

  return [
    "Create a premium social media image for WILLKIN Coffee Roastery, an Indonesian coffee beans supplier for cafes.",
    "Brand direction: modern Jakarta roastery, mature B2B, clean editorial photography, confident but not flashy, no Canva template look.",
    "Visual style: real roasted coffee beans, black flat-bottom pouch, espresso tools, warm natural cafe counter light, sharp premium product photography, subtle Indonesian specialty coffee cues.",
    "Color palette: charcoal black, deep coffee brown, clean white, muted forest green accent, small copper detail. Avoid purple gradients, beige-heavy templates, cartoon graphics, generic stock-photo feel.",
    `Channel: ${channel}.`,
    `Product focus: ${product}.`,
    `Main message/hook: ${hook}.`,
    `Caption context: ${caption.slice(0, 400)}.`,
    `CTA text to include if text rendering is clean: ${cta}.`,
    "Composition: leave safe negative space for short overlay text, product and coffee texture must be the hero, professional ad quality for cafe owners.",
    "Do not include fake logos, fake certification badges, random brand names, misspelled text, or decorative clutter."
  ].join("\n");
}

function sizeForChannel(channel = "") {
  if (/tiktok|reels|short/i.test(channel)) return "1024x1536";
  if (/story/i.test(channel)) return "1024x1536";
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
