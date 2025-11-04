# P&L Dashboard - Claude Code Reference

## Project Overview

This is a **Profit & Loss (P&L) Dashboard** for pub business management. It tracks financial data across fiscal years that run from October 1st to September 30th.

### What This Application Does
- Tracks daily pub figures (gross sales, fees, VAT, income)
- Manages monthly wages with HMRC, NEST pension, and deductions
- Records fixed costs (utilities, services)
- Handles quarterly VAT returns
- Tracks miscellaneous expenses (sundries)
- Generates financial reports and year-on-year comparisons
- Calculates profit: Net Income - (Abbie Pay + Wages + Fixed Costs + Sundries)

### Key Business Logic
- **Fiscal Year**: October 1st - September 30th (not calendar year!)
- **Abbie's Pay**: £455.37 automatically calculated on Fridays
- **Fee Calculation**: (Gross Total * 0.72) / 1.2
- **VAT Calculations**: Gross Total / 1.2 for net amounts
- **NO TRADE Days**: Special flag for days the pub was closed (e.g., Christmas)
- **Smart Date Defaulting**: Form automatically suggests next empty date

## Architecture

### High-Level Structure
```
pandl-app/
├── frontend/          # React SPA with Vite
├── backend/           # Node/Express API (legacy Excel reader)
├── firebase.rules     # Firestore security rules
└── package.json       # Root orchestration
```

### Technology Stack

**Frontend:**
- React 18 with React Router DOM v6
- Vite (dev server & build tool)
- Firebase SDK (Authentication & Firestore)
- Recharts (data visualization)
- date-fns (date manipulation)

**Backend (Legacy):**
- Node.js + Express
- xlsx library (Excel file reading)
- CORS enabled
- Note: Backend is being phased out in favor of direct Firestore access

**Database:**
- Firebase Firestore (NoSQL cloud database)
- Firebase Authentication (email/password)

## Frontend Architecture

### Entry Point & Routing
```
main.jsx → App.jsx
           ├── /login → Login.jsx
           ├── /signup → SignUp.jsx
           └── /* → ProtectedRoute → ProtectedApp
                                     ├── / → Dashboard
                                     ├── /daily → DailyFigures
                                     ├── /wages → Wages
                                     ├── /fixed → FixedCosts
                                     ├── /vat → VAT
                                     ├── /sundries → Sundries
                                     └── /year-on-year → YearOnYear
```

### Directory Structure
```
frontend/src/
├── pages/              # Route components (9 pages)
│   ├── Dashboard.jsx
│   ├── DailyFigures.jsx
│   ├── Wages.jsx
│   ├── FixedCosts.jsx
│   ├── VAT.jsx
│   ├── Sundries.jsx
│   ├── YearOnYear.jsx
│   ├── Login.jsx
│   └── SignUp.jsx
├── components/         # Reusable components (6 components)
│   ├── DailyFigureForm.jsx
│   ├── WagesForm.jsx
│   ├── FixedCostForm.jsx
│   ├── WagesImport.jsx
│   ├── NewYearModal.jsx
│   └── ProtectedRoute.jsx
├── firebase/           # Firebase integration
│   ├── config.js       # Firebase initialization
│   └── firestoreService.js  # All Firestore CRUD operations (677 lines!)
├── contexts/           # React Context providers
│   └── AuthContext.jsx # Authentication state management
├── utils/              # Helper functions
│   ├── fiscalYearUtils.js    # Fiscal year date logic
│   ├── formatters.js         # Currency/date formatting
│   └── cleanupDuplicates.js  # Data cleanup utilities
├── styles/             # CSS modules
├── App.jsx            # Main app shell with routing
├── App.css            # Global styles
├── main.jsx           # React root
└── index.css          # Base styles
```

### State Management Pattern

**No Redux/Zustand** - Uses React's built-in patterns:

1. **Authentication State**: Context API (`AuthContext`)
   - Provides: `currentUser`, `login()`, `signup()`, `logout()`
   - Wraps entire app, persists via Firebase Auth SDK

2. **Page-Level State**: Local `useState` in each page component
   - Each page fetches its own data from Firestore
   - Uses `useEffect` to refetch on user/year changes

3. **Year Selection**: Lifted to App.jsx, passed as prop
   - `selectedYear` state in ProtectedApp component
   - Passed down to all page components

### Data Flow Pattern

```
User Action → Page Component → firestoreService.js → Firestore
                     ↓
              Update Local State
                     ↓
              Re-render UI
```

**Example: Adding Daily Figure**
1. User fills form in `DailyFigureForm.jsx`
2. Form calls `saveOrUpdateDailyFigure(userId, year, date, data)`
3. Service writes to Firestore: `users/{uid}/years/{year}/dailyFigures/{date}`
4. Success callback triggers parent's `fetchData()`
5. Page re-renders with new data

## Firebase/Firestore Architecture

### Firestore Data Model

```
users/{userId}/
  └── years/{year}/              # e.g., "2024-25"
      ├── dailyFigures/{date}    # e.g., "2024-10-01"
      │   ├── date
      │   ├── grossTotal
      │   ├── netTotal
      │   ├── fee
      │   ├── grossIncome
      │   ├── netIncome
      │   ├── vat
      │   ├── abbiesPay
      │   ├── noTrade (boolean)
      │   └── updatedAt
      │
      ├── wages/{month}          # e.g., "2024-10"
      │   ├── month
      │   ├── netOut
      │   ├── invoices
      │   ├── hmrc
      │   ├── nest
      │   ├── deductions
      │   ├── total (calculated)
      │   └── updatedAt
      │
      ├── fixedCosts/{serviceId} # e.g., "electricity"
      │   ├── service
      │   ├── cost
      │   ├── netCost
      │   ├── vat
      │   └── updatedAt
      │
      ├── fixedCostsMonthly/{month}
      │   ├── month
      │   ├── totalCost
      │   └── updatedAt
      │
      ├── vat/{quarterId}        # e.g., "q1"
      │   ├── startDate
      │   ├── endDate
      │   ├── hmrcAmount
      │   ├── marstonsAmount
      │   ├── difference
      │   └── updatedAt
      │
      ├── sundries/{sundryId}
      │   ├── date
      │   ├── amount
      │   ├── vat
      │   ├── net
      │   └── updatedAt
      │
      └── monthlySummaries/{month}
          ├── month
          ├── grossIncome
          ├── netIncome
          ├── abbiePay
          ├── wages
          ├── fixedCosts
          ├── sundries
          ├── profit
          └── updatedAt
```

### Authentication Pattern

- Email/password authentication via Firebase Auth
- `AuthContext` wraps app, provides `currentUser` object
- `ProtectedRoute` component guards all main routes
- Redirects to `/login` if not authenticated
- User ID (`currentUser.uid`) used for data isolation

### Security Rules

See `/Users/pauljohnson/duke/pandl/pandl-app/firebase.rules`
- Users can only access their own data under `users/{userId}`
- All reads/writes require authentication
- Helper function: `isOwner(userId)` validates access

## Key Components Deep Dive

### DailyFigureForm.jsx (580 lines)
**Purpose**: Add/edit daily pub figures with auto-calculation

**Key Features:**
- Auto-calculates all fields from Gross Total
- Smart date defaulting (finds next empty date)
- Friday detection → auto-fills Abbie's Pay (£455.37)
- Confirmation modal before saving
- "No Trade" button for closed days
- Auto-advance to next empty date after save
- Enter key support in modal
- Validates date is within fiscal year

**Calculations:**
```javascript
fee = (grossTotal * 0.72) / 1.2
netTotal = grossTotal / 1.2
grossIncome = grossTotal - fee
netIncome = grossIncome / 1.2
vat = grossIncome - netIncome
abbiesPay = isFriday ? 455.37 : 0
```

### firestoreService.js (677 lines)
**Purpose**: Central Firestore data access layer

**Categories:**
1. Daily Figures CRUD
2. Wages CRUD
3. Fixed Costs CRUD
4. VAT CRUD
5. Sundries CRUD
6. Monthly Summaries (with auto-calculation)
7. Fiscal Year Management (create new years, copy fixed costs)

**Key Functions:**
- `saveOrUpdateDailyFigure(userId, year, date, data)`
- `getAllDailyFigures(userId, year, startDate?, endDate?)`
- `calculateMonthlySummary(userId, year, month)` - Aggregates daily figures
- `recalculateAllMonthlySummaries(userId, year)` - Rebuilds all months
- `initializeNewFiscalYear(userId, year, copyFromYear?)` - Copies fixed costs

**Pattern**: All functions return `{ success: boolean, data?: any, error?: string }`

### Dashboard.jsx
**Purpose**: Financial overview with charts and tables

**Data Source**: `getAllMonthlySummaries(userId, year)`

**Displays:**
- Summary cards (gross income, net income, wages, fixed costs, profit)
- Monthly summary table
- Line chart (income & profit trends)
- Bar chart (expenses breakdown)

**Libraries**: Recharts for visualization

## Fiscal Year Logic

### Key Utilities (fiscalYearUtils.js)

```javascript
// Get current fiscal year (e.g., "2024-25")
getCurrentFiscalYear()

// Check if date is in fiscal year
isDateInFiscalYear(date, "2024-25")

// Get fiscal year date range
getFiscalYearDates("2024-25") // → { startDate, endDate }

// Check if past fiscal year end (triggers new year modal)
isPastFiscalYearEnd("2024-25")

// Get all 12 months in order
getFiscalYearMonths("2024-25") 
// → ["2024-10", "2024-11", ..., "2025-09"]
```

### New Year Workflow

1. App checks if past fiscal year end on load
2. If yes and new year doesn't exist → show `NewYearModal`
3. Modal creates new year document in Firestore
4. Copies fixed costs from previous year (utility bills, etc.)
5. Navigates to Daily Figures with form open
6. User can start entering data for new year

## Configuration Files

### vite.config.js
```javascript
{
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001'  // Proxies to backend
    }
  }
}
```

### firebase.rules
- User-specific data isolation
- Authentication required for all operations
- See file for full ruleset

### package.json (root)
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && node server.js",
    "dev:frontend": "cd frontend && vite"
  }
}
```

## Development Commands

### Setup
```bash
cd pandl-app
npm install                    # Install root dependencies
cd backend && npm install      # Install backend deps
cd ../frontend && npm install  # Install frontend deps
```

### Running
```bash
# Option 1: Run both together (recommended)
npm run dev

# Option 2: Run separately
cd backend && npm start        # Port 3001
cd frontend && npm run dev     # Port 3000

# Option 3: Use convenience script
./start.sh
```

### Building
```bash
cd frontend && npm run build   # Creates /dist folder
```

### Accessing
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/*

## Important Conventions

### Date Formats
- Firestore storage: `"YYYY-MM-DD"` (e.g., "2024-10-01")
- Month storage: `"YYYY-MM"` (e.g., "2024-10")
- Display: `formatDate()` → "01 Oct 2024"
- Display: `formatMonth()` → "October 2024"

### Currency
- Storage: Number (e.g., 1234.56)
- Display: `formatCurrency()` → "£1,234.56"
- Precision: Round to 2 decimal places

### Month Order
Always use fiscal year order (Oct → Sep):
```javascript
['October', 'November', 'December',
 'January', 'February', 'March',
 'April', 'May', 'June',
 'July', 'August', 'September']
```

### Error Handling
All Firestore operations return:
```javascript
{ success: true, data: ... }
// or
{ success: false, error: "message" }
```

## Styling Approach

- Global styles in `App.css` and `index.css`
- Inline styles for component-specific layouts
- No CSS-in-JS library
- Responsive design with CSS Grid/Flexbox
- Color scheme: Purple gradient header (#667eea → #764ba2)

### Key CSS Classes
- `.card` - White box with shadow
- `.stat-card` - Dashboard metric cards
- `.table-container` - Scrollable table wrapper
- `.currency` - Right-aligned currency columns
- `.positive` / `.negative` - Green/red profit indicators

## Data Migration

### Legacy Backend (server.js)
- Reads from Excel file at `/Users/pauljohnson/Downloads/P&L 24_25.xlsx`
- Exposes REST API endpoints
- Being phased out in favor of direct Firestore access
- See `MIGRATION_README.md` in backend folder

### Migration Script
`backend/migrateToFirestore.js` - One-time Excel → Firestore migration

## Common Workflows

### Adding a New Financial Category

1. **Update Firestore structure**:
   - Add new subcollection under `years/{year}/`
   
2. **Create service functions** in `firestoreService.js`:
   ```javascript
   export async function saveOrUpdateCategory(userId, year, id, data) { ... }
   export async function getAllCategories(userId, year) { ... }
   ```

3. **Create page component** in `pages/`:
   - Fetch data on mount with `useEffect`
   - Display in table
   - Add form for entry

4. **Update App.jsx**:
   - Add route in Routes
   - Add navigation link

5. **Update firebase.rules**:
   - Add permission rules for new collection

### Adding a New Calculated Field

1. **Update calculation logic** in relevant form
2. **Update Firestore service** to save new field
3. **Update display components** to show new field
4. **Consider monthly summary** impact

## Testing Notes

- No automated tests currently
- Manual testing workflow:
  1. Sign up new user
  2. Add daily figures
  3. Check Dashboard calculates correctly
  4. Verify year-end rollover

## Firebase Project Details

- **Project ID**: profit-and-loss-294a7
- **Auth Domain**: profit-and-loss-294a7.firebaseapp.com
- **VAT Number**: GB 434001941 (shown in footer)

## Git Status (Current)

Modified files:
- `frontend/src/App.css` - Styling updates
- `frontend/src/firebase/firestoreService.js` - Data service
- `frontend/src/pages/Dashboard.jsx` - Dashboard page
- `frontend/src/pages/FixedCosts.jsx` - Fixed costs page

Untracked files:
- `frontend/src/components/FixedCostForm.jsx` - New form
- `frontend/src/utils/cleanupDuplicates.js` - Utility script
- `frontend/dist/` - Build output

## Recent Improvements (from commits)

1. Smart date defaulting and auto-advance in Daily Figures
2. "No Trade" functionality for closed days
3. Enter key support in confirmation modal
4. Floating point precision fixes (round to 2 decimals)
5. Modal-based editing for wages
6. Clarified invoices should be without VAT

## Common Gotchas

1. **Fiscal Year Confusion**: Always use Oct-Sep, not Jan-Dec
2. **Date Strings**: Always use ISO format "YYYY-MM-DD"
3. **User ID Required**: All Firestore calls need `currentUser.uid`
4. **Year Prop**: Most pages expect `year` prop (e.g., "2024-25")
5. **Rounding**: Always round currency to 2 decimals to avoid 0.000001 errors
6. **Friday Detection**: getDay() returns 5 for Friday (0-indexed, 0=Sunday)
7. **December 25th**: Hardcoded to skip (pub always closed on Christmas)

## Where to Start Making Changes

**Adding Features:**
- New calculation? → Update form component + firestoreService
- New page? → Create in `pages/`, add route in App.jsx
- New data type? → Add Firestore collection + service functions

**Fixing Bugs:**
- Calculation wrong? → Check form component's `calculateValues()`
- Data not saving? → Check firestoreService function + Firebase rules
- UI issue? → Check component's inline styles + App.css

**Performance:**
- Slow loading? → Check Firestore queries (add indexes if needed)
- Too many reads? → Consider caching or batching

## Useful Resources

- Firebase Console: https://console.firebase.google.com
- Recharts Docs: https://recharts.org
- Vite Docs: https://vitejs.dev
- React Router v6: https://reactrouter.com
- date-fns: https://date-fns.org

## Notes for Claude

- This is a **single-user per business** app (not multi-tenant)
- User is "Paul" managing a pub business
- Focus on accuracy for financial calculations
- Date logic is critical (fiscal year Oct-Sep)
- Monthly summaries auto-calculate from daily figures
- Always test with actual fiscal year dates
- The backend is legacy - prefer Firestore operations
