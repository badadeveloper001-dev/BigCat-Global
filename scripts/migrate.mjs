#!/usr/bin/env node
/**
 * Supabase Database Migration Runner
 * Executes all SQL migration files directly via Supabase PostgreSQL
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(__dirname, '..');

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

const ADDITIONAL_MIGRATIONS = [
  'add-pickup-tokens-and-growth-history.sql',
  'create-auth-schema.sql',
  'create-reviews-table.sql',
];

async function runMigrations() {
  console.log('\n🚀 BigCat Global - Supabase Database Migration Runner\n');
  console.log('━'.repeat(70));

  // Validate environment
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('\n❌ Error: Missing Supabase credentials');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n   Make sure .env.local is properly configured.\n');
    process.exit(1);
  }

  // Parse Supabase connection details
  const urlObj = new URL(url);
  const projectRef = urlObj.hostname.split('.')[0];
  
  const connectionString = `postgres://postgres:${serviceKey}@${projectRef}.db.supabase.co:5432/postgres`;

  console.log('✅ Environment variables found');
  console.log(`📍 Project: ${projectRef}`);
  console.log(`🔗 Database: postgres.db.supabase.co`);
  console.log('━'.repeat(70) + '\n');

  let client;
  try {
    client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      keepalives: 1,
      keepalives_idle: 30,
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL\n');
  } catch (error) {
    console.error('❌ Failed to connect to database');
    console.error(`   Error: ${error.message}\n`);
    console.log('💡 Alternative: Run migrations via Supabase Dashboard');
    console.log('   1. Go to: https://app.supabase.com/project/' + projectRef);
    console.log('   2. Navigate to: SQL Editor');
    console.log('   3. Copy-paste each .sql file from scripts/ directory\n');
    process.exit(1);
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const errors = [];

  // Run primary migrations
  console.log('📌 Primary Migrations:\n');
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migrationFile = MIGRATIONS[i];
    const migrationPath = path.join(__dirname, migrationFile);

    try {
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile}`);
        console.log('     ↳ File not found\n');
        skipCount++;
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8').trim();
      if (!sql) {
        console.log(`⚠️  [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile}`);
        console.log('     ↳ Empty file\n');
        skipCount++;
        continue;
      }

      console.log(`⏳ [${String(i + 1).padStart(2)}/${MIGRATIONS.length}] ${migrationFile}`);

      await client.query(sql);
      console.log('   ✅ Success\n');
      successCount++;
    } catch (error) {
      const errorMsg = error.message.split('\n')[0];
      console.log(`   ❌ ${errorMsg}\n`);
      errorCount++;
      errors.push({ file: migrationFile, error: errorMsg });
    }
  }

  // Run additional migrations
  console.log('━'.repeat(70));
  console.log('\n📌 Additional Migrations:\n');

  for (const migrationFile of ADDITIONAL_MIGRATIONS) {
    const migrationPath = path.join(__dirname, migrationFile);

    try {
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  ${migrationFile}`);
        console.log('   ↳ File not found\n');
        skipCount++;
        continue;
      }

      const sql = fs.readFileSync(migrationPath, 'utf-8').trim();
      if (!sql) {
        console.log(`⚠️  ${migrationFile}`);
        console.log('   ↳ Empty file\n');
        skipCount++;
        continue;
      }

      console.log(`⏳ ${migrationFile}`);
      await client.query(sql);
      console.log('   ✅ Success\n');
      successCount++;
    } catch (error) {
      const errorMsg = error.message.split('\n')[0];
      console.log(`   ❌ ${errorMsg}\n`);
      errorCount++;
      errors.push({ file: migrationFile, error: errorMsg });
    }
  }

  // Disconnect
  await client.end();

  // Summary
  console.log('━'.repeat(70));
  console.log('\n📊 Migration Summary:\n');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ⚠️  Skipped:   ${skipCount}`);
  console.log(`   ❌ Errors:    ${errorCount}`);

  if (errors.length > 0 && errorCount <= 5) {
    console.log('\n   Failed migrations:');
    errors.forEach(({ file, error }) => {
      console.log(`   • ${file}`);
      console.log(`     ${error}`);
    });
  }

  console.log('\n' + '━'.repeat(70));
  console.log('\n✨ Supabase Database Setup Complete!\n');
  console.log('📌 Next Steps:');
  console.log('   1. ✅ Database schema created');
  console.log('   2. Go to Supabase Dashboard → Authentication → Providers');
  console.log('   3. Enable "Email" and optionally "Google"');
  console.log('   4. Configure Email Templates (Optional)');
  console.log('   5. Run: npm run dev\n');

  process.exit(errorCount > 0 ? 1 : 0);
}

runMigrations().catch(error => {
  console.error('\n❌ Fatal Error:', error.message);
  process.exit(1);
});
