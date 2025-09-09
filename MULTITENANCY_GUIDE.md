# Multi-Tenant Implementation Guide

## Step-by-Step Instructions

### 1. Apply Database Migration
Run this in your Supabase SQL editor:
```bash
# Or run the migration file we created:
supabase db push
```

### 2. Deploy the Edge Functions
```bash
# Deploy the generate-owner-links function
supabase functions deploy generate-owner-links

# Deploy the updated ingest-form function
supabase functions deploy ingest-form
```

### 3. Get Your Other Form IDs
You need to do the same process for your other 2 forms:

1. Open your "Custos" Google Form
2. Add a "Short Answer" field called "Owner Token" 
3. Make it required
4. Click three dots → "Get pre-filled link"
5. Enter "NAOALTERAR" as test value
6. Get the link and extract the form ID and entry ID

Do the same for "Mão de Obra" form.

### 4. Update form_config Table
Once you have all form IDs, run this SQL:
```sql
-- Add your other forms
INSERT INTO public.form_config (form_type, form_id, token_entry_id) VALUES
('custos', 'YOUR_CUSTOS_FORM_ID', 'entry.YOUR_CUSTOS_ENTRY_ID'),
('mao_de_obra', 'YOUR_MAO_OBRA_FORM_ID', 'entry.YOUR_MAO_OBRA_ENTRY_ID')
ON CONFLICT (form_type) DO UPDATE SET
  form_id = EXCLUDED.form_id,
  token_entry_id = EXCLUDED.token_entry_id,
  updated_at = now();
```

### 5. Test Token Generation
First, get your owner_id:
```sql
SELECT id, phone_e164, business_name FROM owners;
```

Then test the function:
```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/generate-owner-links \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "YOUR_OWNER_ID"}'
```

This should return:
```json
{
  "success": true,
  "owner_id": "...",
  "token": "generated-token",
  "links": {
    "vendas": "https://docs.google.com/forms/...&entry.1118057237=generated-token"
  }
}
```

### 6. Update Google Apps Script
In your Google Form's response spreadsheet:
1. Go to Extensions → Apps Script
2. Update your script to send the token:

```javascript
function onFormSubmit(e) {
  const namedValues = e.namedValues || {};
  
  // Get the owner token from the hidden field
  const ownerToken = namedValues['Owner Token'] ? namedValues['Owner Token'][0] : null;
  
  // Your existing mapping function
  const payload = {
    date: namedValues['Data'] ? namedValues['Data'][0] : null,
    net_sales: namedValues['Vendas Líquidas'] ? parseFloat(namedValues['Vendas Líquidas'][0]) : 0,
    // ... rest of your field mappings
  };
  
  // Add owner_token to payload
  payload.owner_token = ownerToken;
  
  const body = {
    source_form: 'vendas',
    payload: payload,
    source_sheet: SpreadsheetApp.getActive().getName(),
    source_row: e.range ? e.range.getRow() : null
  };
  
  // Send to Supabase
  const response = UrlFetchApp.fetch(
    'YOUR_SUPABASE_URL/functions/v1/ingest-form',
    {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': 'YOUR_WEBHOOK_SECRET'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    }
  );
  
  console.log('Response:', response.getContentText());
}
```

### 7. Test End-to-End Flow
1. Call generate-owner-links to get your personalized form link
2. Click the vendas link
3. Fill the form (token is already hidden and filled)
4. Submit
5. Check your Google Sheet - token should be there
6. Check Supabase form_submissions table - data should be linked to correct owner

## Next Steps
Once this is working for vendas form, repeat the process for custos and mao_de_obra forms.
