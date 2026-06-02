import { createSign } from "node:crypto";

const scope = "https://www.googleapis.com/auth/spreadsheets";

export function isGoogleSheetsConfigured() {
  return Boolean(process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export async function checkGoogleSheetsAccess() {
  if (!isGoogleSheetsConfigured()) {
    return {
      ok: false,
      message: "GOOGLE_SHEETS_ID atau GOOGLE_SERVICE_ACCOUNT_JSON belum diisi."
    };
  }

  const accessToken = await getServiceAccountAccessToken();
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_ID}?fields=spreadsheetId,properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      signal: AbortSignal.timeout(8000)
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      message: `Google Sheets API test failed: ${response.status} ${await response.text()}`
    };
  }

  const payload = await response.json();
  return {
    ok: true,
    spreadsheetId: payload.spreadsheetId,
    title: payload.properties?.title || "Untitled spreadsheet",
    sheets: (payload.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean)
  };
}

async function getServiceAccountAccessToken() {
  const serviceAccount = parseServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const claim = {
    iss: serviceAccount.client_email,
    scope,
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Google OAuth token failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  return payload.access_token;
}

function parseServiceAccount() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tidak berisi client_email/private_key.");
  }
  return parsed;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}
