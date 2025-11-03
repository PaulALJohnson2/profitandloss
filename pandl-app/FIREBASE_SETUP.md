# Firebase Setup Guide

## Overview

Your P&L Dashboard is now connected to Firebase Firestore. This allows you to store and retrieve financial data in real-time.

## What's Been Set Up

### 1. Firebase Configuration
Location: `frontend/src/firebase/config.js`

Your Firebase project details:
- **Project ID**: profit-and-loss-294a7
- **Auth Domain**: profit-and-loss-294a7.firebaseapp.com
- **App ID**: 1:436391574423:web:c3e3239d219f81cb9362d2

### 2. Firestore Collections

The following collections are set up in your database:

- **dailyFigures** - Daily pub figures (gross total, net total, fees, VAT, etc.)
- **monthlySummary** - Monthly financial summaries
- **wages** - Monthly wage information
- **fixedCosts** - Fixed monthly costs
- **vat** - VAT return information
- **sundries** - Miscellaneous expenses

### 3. Firestore Service Functions
Location: `frontend/src/firebase/firestoreService.js`

Available functions:
- `addDailyFigure(data)` - Add a new daily figure
- `updateDailyFigure(id, data)` - Update existing daily figure
- `getDailyFigures(startDate, endDate)` - Get daily figures (with optional date range)
- `getDailyFigureByDate(date)` - Get a specific day's data
- `deleteDailyFigure(id)` - Delete a daily figure
- `saveOrUpdateDailyFigure(date, data)` - Smart save (updates if exists, creates if new)
- Similar functions for wages, fixed costs, VAT, and sundries

## Testing the Connection

1. Navigate to http://localhost:3000
2. Click on "Firebase Test" in the navigation menu
3. Click "Test Firebase Connection" button
4. You should see success messages confirming:
   - Firebase is initialized
   - Connected to Firestore
   - Can write data
   - Can read data

## Important: Firestore Security Rules

Before using in production, you MUST update your Firestore security rules:

### For Development (Allow all reads/writes):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### For Production (Recommended - requires authentication):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

To update rules:
1. Go to https://console.firebase.google.com
2. Select your project: profit-and-loss-294a7
3. Go to Firestore Database
4. Click on "Rules" tab
5. Update and publish the rules

## Data Structure Examples

### Daily Figure
```javascript
{
  date: '2024-10-01',          // YYYY-MM-DD format
  grossTotal: 1495.84,
  netTotal: 1246.533333,
  fee: 897.504,
  grossIncome: 418.8352,
  netIncome: 349.029333,
  vat: 69.805867,
  abbiesPay: 0,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Monthly Summary
```javascript
{
  month: '2024-10-01',
  grossIncome: 16215.2648,
  netIncome: 13512.72067,
  abbiePay: 1821.48,
  wages: 7548.21,
  fixedCosts: 414.65,
  sundries: 0,
  profit: 3728.380667,
  createdAt: Timestamp
}
```

## Next Steps

1. ✅ Firebase is connected
2. ✅ Test page is available
3. ⏭️ Create data input forms
4. ⏭️ Migrate existing Excel data to Firestore (optional)
5. ⏭️ Update the app to read from Firestore instead of Excel

## Troubleshooting

### "Permission denied" error
- Check your Firestore security rules
- Make sure rules allow reads/writes

### "Failed to get document" error
- Verify your Firebase config is correct
- Check your internet connection
- Verify the collection name exists in Firestore

### Connection timeout
- Check if Firebase project exists in console
- Verify API key is correct
- Check browser console for detailed errors

## Support

For Firebase documentation: https://firebase.google.com/docs/firestore
