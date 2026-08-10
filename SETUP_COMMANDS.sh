#!/bin/bash
# BigCat Global - Setup Command Reference

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════╗
║                  🚀 BigCat Global - Setup Commands 🚀               ║
╚══════════════════════════════════════════════════════════════════════╝

📋 AVAILABLE COMMANDS:

  🔧 Database & Setup
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
    npm run setup:all         ⭐ ONE-COMMAND SETUP (RECOMMENDED)
                             • Verifies Supabase connection
                             • Runs all database migrations
                             • Sets up tables and schemas
                             • Shows next steps
    
    npm run setup-db          Complete database setup
                             • Connects to Supabase
                             • Executes all 28 migrations
                             • Verifies table creation
    
    npm run migrate           Run database migrations only
    
    npm run verify-supabase   Test Supabase connection
                             • Checks API connectivity
                             • Displays configuration status

  💻 Development
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
    npm run dev              Start development server
                            • Runs on http://localhost:3000
                            • Hot reload enabled
                            • Connects to Supabase
    
    npm run build            Build for production
    
    npm run start            Run production server
    
    npm run lint             Check code quality

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ QUICK START CHECKLIST:

  1. ✅ Environment Variables
     └─ Supabase credentials already configured in .env.local

  2. ⏭️  Setup Database
     └─ Run: npm run setup:all

  3. 🔑 Enable Authentication
     └─ Open: https://app.supabase.com/project/gpcldplegpslsnjubuhw
     └─ Go to: Authentication → Providers
     └─ Enable "Email"

  4. 🚀 Start Development
     └─ Run: npm run dev
     └─ Open: http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTATION:

  QUICK_START.md           ← Start here! Complete setup guide
  SUPABASE_SETUP_GUIDE.md  ← Detailed Supabase configuration
  README.md                ← Project overview
  USER_FLOWS.md            ← Application user flows

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 IMPORTANT LINKS:

  Supabase Dashboard: https://app.supabase.com/project/gpcldplegpslsnjubuhw
  Local Dev: http://localhost:3000
  Production: https://bigcat-global.vercel.app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 PRO TIPS:

  • Use "npm run setup:all" for automatic complete setup
  • Check environment before running: npm run verify-supabase
  • Keep .env.local secure - never commit to git
  • Database tables visible in Supabase dashboard after migrations
  • Enable email provider before testing auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to get started? Run: npm run setup:all

EOF
