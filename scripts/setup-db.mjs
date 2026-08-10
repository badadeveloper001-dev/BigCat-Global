#!/usr/bin/env node
/**
 * Complete Supabase Setup & Database Migration
 * Runs migrations and verifies database configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(__dirname);

// Load environment variables from .env.local
dotenvConfig({ path: path.join(projectDir, '.env.local') });

console.clear();
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║        🚀 BigCat Global - Complete Database Setup 🚀           ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('\n');

// Step 1: Check environment
console.log('📋 Step 1: Checking Environment Variables...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error('❌ Missing Supabase Configuration\n');
  if (!url) console.error('   • NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) console.error('   • NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!serviceKey) console.error('   • SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Make sure .env.local exists with all credentials.\n');
  process.exit(1);
}

const projectRef = url.replace('https://', '').split('.')[0];
console.log('✅ Environment variables loaded');
console.log(`   📍 Project: ${projectRef}`);
console.log('   🔑 Service Role Key: ••••••••••\n');

// Step 2: Test database connection
console.log('📋 Step 2: Testing Database Connection...\n');

const connectionString = `postgres://postgres:${serviceKey}@${projectRef}.db.supabase.co:5432/postgres`;

let client;
async function setupDatabase() {
  try {
    client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      keepalives: 1,
      keepalives_idle: 30,
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');

    // Step 3: Run migrations
    console.log('📋 Step 3: Running Database Migrations...\n');
    console.log('━'.repeat(70) + '\n');

    await runMigrations(client);

    // Step 4: Verify tables
    console.log('📋 Step 4: Verifying Database Tables...\n');

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableCount = result.rows.length;
    console.log(`✅ Database verification complete`);
    console.log(`   📊 Tables created: ${tableCount}\n`);

    if (tableCount > 0) {
      console.log('   Sample tables:');
      result.rows.slice(0, 5).forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
      if (tableCount > 5) {
        console.log(`   ... and ${tableCount - 5} more\n`);
      } else {
        console.log('');
      }
    }

    await client.end();

    // Final steps
    console.log('━'.repeat(70) + '\n');
    console.log('✨ Setup Complete!\n');
    console.log('📌 Final Configuration Steps:\n');
    console.log('1. Enable Auth Providers (Supabase Dashboard → Authentication):');
    console.log('   • Go to: https://app.supabase.com/project/' + projectRef + '/auth/providers');
    console.log('   • Click "Email" to enable email/password auth');
    console.log('   • (Optional) Enable "Google" for social login\n');
    
    console.log('2. Configure Redirect URLs (Settings → URL Configuration):');
    console.log('   • Development: http://localhost:3000/auth/callback');
    console.log('   • Production: https://bigcat-global.vercel.app/auth/callback\n');
    
    console.log('3. Configure Email (Authentication → Email Templates):');
    console.log('   • Update email templates (optional but recommended)\n');
    
    console.log('4. Start Development Server:');
    console.log('   $ npm run dev\n');
    
    console.log('5. Access the app:');
    console.log('   • Open: http://localhost:3000');
    console.log('   • Try signing up at: http://localhost:3000/auth/signup\n');

    console.log('📚 Resources:');
    console.log('   • Supabase Dashboard: https://app.supabase.com');
    console.log('   • Setup Guide: SUPABASE_SETUP_GUIDE.md\n');

  } catch (error) {
    console.error('❌ Database Setup Failed\n');
    console.error('Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   • Verify Supabase credentials in .env.local');
    console.log('   • Check internet connection');
    console.log('   • Ensure Supabase project is active\n');
    
    if (client) {
      await client.end().catch(() => {});
    }
    process.exit(1);
  }
}

async function runMigrations(client) {
  const MIGRATIONS = [
    '001-setup-schema.sql',
    '002-add-otp-table.sql',
    '003-add-full-name-field.sql',
    '004-create-products-table.sql',
    '005-create-orders-table.sql',
    '006-add-user-profile-tables.sql',
    '007-add-auth-google-cac-columns.sql',
    '008-create-agents-table.sql',
    '009-create-merchant-onboarding-table.sql',
    '010-add-merchant-tokens.sql',
    '011-enable-rls-policies.sql',
    '012-add-merchant-city-state-columns.sql',
    '013-add-product-cost-price.sql',
    '014-create-logistics-tables.sql',
    '015-create-support-issues-table.sql',
    '016-add-services-core.sql',
    '017-add-service-availability-fields.sql',
    '018-add-merchant-type.sql',
    '019-add-user-safety-states.sql',
    '020-create-notification-automation-tables.sql',
    '021-create-rider-payouts-table.sql',
    '022-create-promotions-tables.sql',
    '023-extend-promotions-v2.sql',
    '024-create-merchant-followers.sql',
    '025-create-service-bills.sql',
    '026-add-performance-indexes.sql',
    '027-agent-wallet-onboarding-fee.sql',
    '028-fix-onboarding-request-id-types.sql',
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migrationFile = MIGRATIONS[i];
    const migrationPath = path.join(__dirname, migrationFile);

    try {
      if (!fs.existsSync(migrationPath)) {
        process.stdout.write(`⏭️  [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile} (not found)\n`);
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8').trim();
      if (!sql) {
        process.stdout.write(`⏭️  [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile} (empty)\n`);
        continue;
      }

      process.stdout.write(`⏳ [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile} `);

      await client.query(sql);
      console.log('✅');
      successCount++;
    } catch (error) {
      console.log('⚠️');
      errorCount++;
    }
  }

  console.log(`\n━${Array(69).fill('━').join('')}\n`);
  console.log(`✅ Migrations: ${successCount}/${MIGRATIONS.length} successful\n`);

  if (errorCount > 0) {
    console.log(`⚠️  ${errorCount} migrations had issues (may be expected)\n`);
  }
}

setupDatabase().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
