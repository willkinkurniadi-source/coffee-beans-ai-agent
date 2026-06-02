# Airtable API Quickstart

Use Airtable Personal Access Tokens, not legacy API keys.

## Required Token

Create a Personal Access Token in Airtable Developer Hub.

Recommended scopes for this app:
- `data.records:read`
- `data.records:write`
- `schema.bases:read`

Resource access:
- Add the WILLKIN Coffee Roastery base only.

## Required Environment Variables

```bash
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
DATA_SOURCE=airtable
AIRTABLE_TABLE_PRODUCTS=Products
AIRTABLE_TABLE_STOCK=Stock
AIRTABLE_TABLE_LEADS=Leads
AIRTABLE_TABLE_OUTREACH_LOG=Outreach Log
AIRTABLE_TABLE_ORDERS=Orders
AIRTABLE_TABLE_PACKAGING=Packaging
AIRTABLE_TABLE_CONTENT_CALENDAR=Content Calendar
AIRTABLE_TABLE_DAILY_BRIEFS=Daily Brief
```

## Endpoint Pattern

```text
GET https://api.airtable.com/v0/{baseId}/{tableName}
Authorization: Bearer {personalAccessToken}
```

Example:

```bash
curl "https://api.airtable.com/v0/appXXXXXXXXXXXXXX/Leads" \
  -H "Authorization: Bearer patXXXXXXXXXXXXXX"
```

## Notes

- Airtable list records returns pages of up to 100 records.
- If the response includes `offset`, the app must request the next page with `?offset=...`.
- Empty fields are not returned by Airtable, so the app normalizes missing values.
