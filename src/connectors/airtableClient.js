const AIRTABLE_API_URL = "https://api.airtable.com/v0";

export function isAirtableConfigured() {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

export async function fetchAirtableTable(tableName, options = {}) {
  if (!isAirtableConfigured()) {
    return {
      mocked: true,
      tableName,
      records: [],
      status: "not_connected_missing_airtable_env"
    };
  }

  const records = [];
  let offset = undefined;

  do {
    const url = new URL(`${AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    if (offset) url.searchParams.set("offset", offset);
    if (options.pageSize) url.searchParams.set("pageSize", String(options.pageSize));
    if (options.view) url.searchParams.set("view", options.view);
    if (options.filterByFormula) url.searchParams.set("filterByFormula", options.filterByFormula);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error ${response.status}: ${await response.text()}`);
    }

    const payload = await response.json();
    records.push(...(payload.records || []).map(fromAirtableRecord));
    offset = payload.offset;
  } while (offset);

  return {
    mocked: false,
    tableName,
    records,
    status: "ok"
  };
}

export async function createAirtableRecord(tableName, fields, options = {}) {
  if (!isAirtableConfigured()) {
    return { mocked: true, tableName, fields, status: "not_connected_missing_airtable_env" };
  }

  const response = await fetch(`${AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
    },
    body: JSON.stringify({ fields, ...(options.typecast ? { typecast: true } : {}) })
  });

  if (!response.ok) {
    throw new Error(`Airtable create error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function updateAirtableRecord(tableName, recordId, fields, options = {}) {
  if (!isAirtableConfigured()) {
    return { mocked: true, tableName, recordId, fields, status: "not_connected_missing_airtable_env" };
  }

  const response = await fetch(
    `${AIRTABLE_API_URL}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`
      },
      body: JSON.stringify({ fields, ...(options.typecast ? { typecast: true } : {}) })
    }
  );

  if (!response.ok) {
    throw new Error(`Airtable update error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function fromAirtableRecord(record) {
  return {
    airtable_record_id: record.id,
    ...(record.fields || {})
  };
}
