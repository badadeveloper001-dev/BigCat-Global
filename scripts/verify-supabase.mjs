#!/usr/bin/env node
/**
 * Supabase Quick Setup & Verification
 */

import fetch from 'node-fetch';
import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(__dirname);

dotenvConfig({ path: path.join(projectDir, '.env.local') });

console.clear();
console.log('\n🚀 BigCat Global - Supabase Verification\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('❌ Missing environment variables in .env.local\n');
  process.exit(1);
}

const projectRef = url.replace('https://', '').split('.')[0];

console.log('Testing Supabase Connection...\n');
console.log(`Project: ${projectRef}`);
console.log(`URL: ${url}\n`);

// Test API connectivity
async function testConnection() {
  try {
    console.log('⏳ Testing API connectivity...');
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': anonKey,
      },
    });

    if (response.ok) {
      console.log('✅ API is accessible\n');
      return true;
    } else {
      console.log(`❌ API returned status ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not reach API via REST\n');
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

async function run() {
  const isConnected = await testConnection();

  console.log('═'.repeat(70) + '\n');
  console.log('📌 Database Migration Options:\n');

  if (isConnected) {
    console.log('✅ Option 1: Automatic Setup (Recommended)');
    console.log('   Command: npm run migrate\n');
  }

  console.log('📖 Option 2: Manual Setup (Supabase Dashboard)');
  console.log(`   1. Open: https://app.supabase.com/project/${projectRef}`);
  console.log('   2. Go to: SQL Editor');
  console.log('   3. Open each file from scripts/ directory');
  console.log('   4. Copy-paste content and run\n');

  console.log('═'.repeat(70) + '\n');
  console.log('📚 Setup Documentation:');
  console.log('   See: SUPABASE_SETUP_GUIDE.md for detailed instructions\n');

  console.log('🚀 Quick Start:');
  console.log('   1. npm run migrate          (if auto-migration works)');
  console.log('   2. npm run dev              (start development server)');
  console.log('   3. Open: http://localhost:3000\n');

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
