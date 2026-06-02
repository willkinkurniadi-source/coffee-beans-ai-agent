export async function callOpenAI({ system, user, jsonSchema }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      mocked: true,
      message: "OPENAI_API_KEY belum diisi. Connector siap, tapi masih pakai output lokal."
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4",
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      text: jsonSchema
        ? {
            format: {
              type: "json_schema",
              name: "agent_output",
              schema: jsonSchema,
              strict: true
            }
          }
        : undefined
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

