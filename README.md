# TheRAI Monorepo

Professional monorepo setup with workspaces for clean separation between main app and auth app.

## 🏗️ Architecture

```
therai-monorepo/
├── main-app/          # Main TheRAI application (therai.co)
├── auth-app/          # Auth-only app (auth.therai.co)
├── supabase/          # Shared Supabase functions & migrations
└── package.json       # Root workspace configuration
```

## 🚀 Development

### Start Main App (Default)
```bash
npm run dev
# or
npm run dev:main
```

### Start Auth App
```bash
npm run dev:auth
```

### Start Both Apps (Advanced)
```bash
npm run dev:both
```

### Build Commands
```bash
npm run build          # Build main app
npm run build:main     # Build main app
npm run build:auth     # Build auth app
npm run build:all      # Build both apps
```

## 🌐 Deployment

### Vercel Projects
- **Main App**: `therai.co` (Root Directory: `main-app`)
- **Auth App**: `auth.therai.co` (Root Directory: `auth-app`)

### Environment Variables
Each app has its own environment variables in Vercel:
- `main-app`: Full app environment
- `auth-app`: Minimal auth environment (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)

## 🔧 Workspace Benefits

✅ **Clean Separation**: Each app is independent  
✅ **Shared Dependencies**: Common packages managed at root  
✅ **Simple Commands**: `npm run dev` works from anywhere  
✅ **Professional Structure**: Industry standard monorepo pattern  
✅ **Easy Deployment**: Vercel handles root directory per project  

## 📁 App Responsibilities

### Main App (`main-app/`)
- Full TheRAI application
- Chat, reports, clients, settings
- Complex UI and business logic
- Runs on `therai.co`

### Auth App (`auth-app/`)
- Email verification only
- Password reset
- Minimal, focused UI
- Runs on `auth.therai.co`

### Shared (`supabase/`)
- Edge functions
- Database migrations
- Shared business logic
- Used by both apps

## 🛠️ Maintenance

### Install Dependencies
```bash
npm run install:all
```

### Clean Build Artifacts
```bash
npm run clean
```

### Add New Dependencies
```bash
# To main app
npm install <package> --workspace=main-app

# To auth app  
npm install <package> --workspace=auth-app

# To root (shared)
npm install <package>
```
