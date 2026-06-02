export function generateContentPlan(products, brandVoice) {
  const coffeeProducts = products.filter(isCoffeeBeanProduct);
  const product =
    coffeeProducts.find((item) => /classic blend|house blend|espresso blend/i.test(item.nama_produk || "")) ||
    coffeeProducts.find((item) => item.priority_to_sell === "high") ||
    coffeeProducts[0] ||
    {};
  const name = product.nama_produk || "House Espresso Blend";
  const notes = product.flavor_notes || "chocolate, nutty, caramel";

  return {
    brandVoice,
    product_focus: name,
    content_items: [
      {
        channel: "Instagram",
        content_type: "feed",
        objective: "sample_request",
        product_focus: name,
        hook: "Beans enak saja tidak cukup kalau cafe butuh konsistensi setiap hari.",
        caption: `Untuk cafe, coffee beans harus stabil: rasa konsisten, mudah dikalibrasi, dan supply aman. ${name} kami siapkan untuk daily espresso dengan notes ${notes}. Cocok untuk milk-based dan black coffee. DM untuk price list dan sample 300g.`,
        cta: "DM SAMPLE untuk price list cafe",
        visual_brief: "Foto packshot beans WILLKIN di samping portafilter dan gelas latte, clean cafe counter."
      },
      {
        channel: "TikTok",
        content_type: "short_video",
        objective: "lead_generation",
        product_focus: name,
        hook: "Cafe kamu sering ganti setting grinder padahal recipe sama?",
        caption: `Ini tanda beans kurang stabil. ${name} dibuat untuk cafe yang butuh rasa konsisten, supply aman, dan margin per cup yang jelas.`,
        cta: "Komentar CAFE untuk price list",
        script: [
          "Opening: Cafe kamu sering ganti setting grinder padahal recipe sama?",
          `Middle: ${name} dibuat untuk daily espresso dengan notes ${notes}.`,
          "Proof: cocok untuk milk based, easy calibration, dan bisa request sample 300g.",
          "Close: komentar CAFE atau DM SAMPLE."
        ].join("\n"),
        visual_brief: "Owner talking head 20-30 detik, cutaway roasting, close-up beans, shot espresso."
      },
      {
        channel: "WhatsApp",
        content_type: "broadcast",
        objective: "sample_request",
        product_focus: name,
        hook: "Ready stock beans cafe minggu ini",
        caption: `Halo kak, minggu ini kami punya ${name} ready stock untuk kebutuhan cafe. Notes: ${notes}. Bisa request price list cafe dan sample 300g untuk cupping/kalibrasi.`,
        cta: "Balas SAMPLE"
      },
      {
        channel: "Tokopedia",
        content_type: "product_update",
        objective: "marketplace_conversion",
        product_focus: name,
        hook: `${name} untuk kebutuhan cafe`,
        caption: `${name} ready stock untuk cafe, kantor, dan reseller. Notes ${notes}. Chat untuk kebutuhan bulk atau recurring.`,
        cta: "Chat toko untuk harga cafe"
      }
    ],
    ugc_owner_script: {
      title: `Kenapa cafe butuh beans stabil - ${name}`,
      duration_seconds: 30,
      talking_points: [
        "Masalah cafe: rasa espresso berubah walau recipe sama.",
        `Solusi WILLKIN: ${name} untuk konsistensi dan supply harian.`,
        "Offer: sample 300g untuk cupping sebelum recurring order."
      ],
      teleprompter: `Halo, saya Willkin dari WILLKIN Coffee Roastery. Kalau cafe kamu sering adjust grinder berkali-kali padahal recipe sama, masalahnya bisa dari beans yang kurang stabil. ${name} kami siapkan untuk cafe yang butuh rasa konsisten, mudah dikalibrasi, dan supply aman. Kalau mau test, DM SAMPLE, nanti kami bantu kirim price list dan sample 300g.`
    },
    feed_post: {
      hook: "Beans enak saja tidak cukup kalau cafe butuh konsistensi setiap hari.",
      caption: `Untuk cafe, coffee beans harus stabil: rasa konsisten, mudah dikalibrasi, dan supply aman. ${name} kami siapkan untuk daily espresso dengan notes ${notes}. Cocok untuk milk-based dan black coffee. DM untuk price list dan sample 300g.`,
      cta: "DM SAMPLE untuk price list cafe"
    },
    story_sequence: [
      "Frame 1: Masalah cafe hari ini: espresso berubah-ubah walau recipe sama.",
      `Frame 2: Solusi: gunakan beans dengan roast profile stabil seperti ${name}.`,
      "Frame 3: CTA: minta sample 300g untuk test di mesin cafe kamu."
    ],
    short_video_script: [
      "Opening: Barista sering adjust grind berkali-kali karena beans tidak stabil?",
      `Middle: ${name} dibuat untuk cafe yang butuh consistency dan margin per cup yang jelas.`,
      "Close: Kirim DM SAMPLE, kami bantu rekomendasikan beans sesuai menu cafe."
    ],
    whatsapp_broadcast: `Halo kak, minggu ini kami punya ${name} ready stock untuk kebutuhan cafe. Notes: ${notes}. Bisa request price list cafe dan sample 300g untuk cupping/kalibrasi.`
  };
}

function isCoffeeBeanProduct(item) {
  const text = `${item.nama_produk || ""} ${item.product_name || ""} ${item.jenis || ""} ${item.category || ""}`;
  return /coffee|kopi|beans|bean|robusta|arabica|blend|espresso|gayo|kintamani|preanger/i.test(text) && !/packaging|pouch|bag|sticker|label/i.test(text);
}
