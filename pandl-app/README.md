# P&L Dashboard Application

A comprehensive Profit & Loss dashboard for pub business management, tracking financial data from October 1st to September 30th.

## Features

- **Dashboard**: Overview of monthly financial performance with charts and key metrics
- **Daily Figures**: Detailed daily pub figures with date filtering
- **Wages**: Monthly wages breakdown including HMRC, NEST, and deductions
- **Fixed Costs**: Monthly fixed costs breakdown with service details
- **VAT Returns**: Quarterly VAT returns with HMRC vs Marstons comparison
- **Sundries**: Miscellaneous expenses tracking

## Financial Year

The application is designed for a financial year running from:
- **Start Date**: 1st October
- **End Date**: 30th September (last day of the financial year)

The system includes all 12 months from October through September, even if values are zero. This ensures complete accountability across the full financial year.

Years are separate for viewability but connected for accountability through the navigation system.

## Installation

1. Install dependencies:
```bash
cd pandl-app
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## Running the Application

### Option 1: Run both frontend and backend together
```bash
npm run dev
```

### Option 2: Run separately

**Backend (Terminal 1):**
```bash
cd backend
npm start
```
The backend will run on http://localhost:3001

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```
The frontend will run on http://localhost:3000

## Accessing the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Data Source

The application reads data from:
```
/Users/pauljohnson/Downloads/P&L 24_25.xlsx
```

Make sure this file exists and contains the following sheets:
- Monthly Summary
- Daily Pub Figures
- Wages
- Fixed
- VAT
- Sundries

## Navigation

Use the top navigation bar to switch between different views:
- **Dashboard**: Main overview with charts and totals
- **Daily Figures**: Daily transaction records
- **Wages**: Staff wages and related costs
- **Fixed Costs**: Monthly fixed expenses
- **VAT**: VAT return comparisons
- **Sundries**: Miscellaneous expenses

## Year Selection

Use the year selector in the top-right corner to switch between financial years (currently supports 2024/25).

## Technology Stack

- **Frontend**: React, Vite, Recharts (for visualizations)
- **Backend**: Node.js, Express
- **Data Processing**: xlsx library for Excel file reading

## VAT Information

VAT No: GB 434001941

## Notes

- All currency values are displayed in GBP (£)
- Profit calculations: Net Income - (Abbie Pay + Wages + Fixed Costs + Sundries)
- Negative profits are shown in red, positive in green
- Charts update dynamically based on the data
- **Financial Year Coverage**: The app displays all 12 months from October 1st to September 30th, including months with zero values for complete accountability
