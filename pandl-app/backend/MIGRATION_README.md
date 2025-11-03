# Firestore Migration Guide

This guide will help you migrate your Excel data to Firestore.

## Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the downloaded JSON file as `serviceAccountKey.json` in the `/backend` directory
   - ⚠️ **IMPORTANT**: Add `serviceAccountKey.json` to your `.gitignore` file!

2. **Install firebase-admin package**
   ```bash
   cd backend
   npm install firebase-admin
   ```

## Running the Migration

1. Make sure your Excel file path is correct in `migrateToFirestore.js`:
   ```javascript
   const EXCEL_PATH = '/Users/pauljohnson/Downloads/P&L 24_25.xlsx';
   ```

2. Run the migration script:
   ```bash
   cd backend
   node migrateToFirestore.js
   ```

3. You should see output like:
   ```
   Starting migration...
   User ID: 1ToDjxTaXAb9aNDecWHSkuNldCS2
   Year: 2024-25

   Migrating 366 daily figures...
   Migrating 12 wage records...
   Migrating 7 fixed costs...
   ...
   ✅ Migration completed successfully!
   ```

## Firestore Structure

After migration, your data will be organized as:

```
users/
  └── 1ToDjxTaXAb9aNDecWHSkuNldCS2/
      └── years/
          └── 2024-25/
              ├── dailyFigures/
              │   ├── 2024-10-01
              │   ├── 2024-10-02
              │   └── ...
              ├── wages/
              │   ├── 2024-10
              │   ├── 2024-11
              │   └── ...
              ├── fixedCosts/
              │   ├── electricity
              │   ├── gas
              │   └── ...
              ├── fixedCostsMonthly/
              │   ├── 2024-10
              │   └── ...
              ├── vat/
              │   ├── q1
              │   ├── q2
              │   └── ...
              ├── sundries/
              │   ├── 2024-10-01-0
              │   └── ...
              └── monthlySummaries/
                  ├── 2024-10
                  ├── 2024-11
                  └── ...
```

## Next Steps

After migration:

1. **Set up Firestore Security Rules** (see firestore.rules)
2. **Update frontend components** to use Firestore instead of the backend API
3. **Test the application** to ensure all data is accessible
4. **(Optional)** Delete the backend server once everything works

## Troubleshooting

### Permission Denied Errors
- Make sure your service account key is correct
- Verify the Firebase project ID matches your configuration

### Data Not Showing Up
- Check the Firestore console to verify data was written
- Ensure user ID and year match what's being used in the frontend

### Batch Size Errors
- The script handles batching automatically
- If you still see errors, the batch size can be adjusted in the script
