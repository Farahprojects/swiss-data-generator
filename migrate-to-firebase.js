#!/usr/bin/env node

/**
 * Migration script to move data from Supabase to Firebase Firestore
 * Run with: node migrate-to-firebase.js
 */

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateTable(tableName, transformFn) {
  console.log(`🔄 Migrating ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    
    console.log(`📊 Found ${data.length} records in ${tableName}`);
    
    const batch = db.batch();
    let count = 0;
    
    for (const record of data) {
      const transformed = transformFn(record);
      const docRef = db.collection(tableName).doc(record.id);
      batch.set(docRef, transformed);
      count++;
      
      // Firestore batch limit is 500
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`✅ Committed batch of ${count} records`);
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${count} records`);
    }
    
    console.log(`✅ Successfully migrated ${tableName}`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
  }
}

// Transform functions for each table
const transforms = {
  profiles: (record) => ({
    id: record.id,
    email: record.email,
    email_verified: record.email_verified,
    subscription_plan: record.subscription_plan,
    subscription_status: record.subscription_status,
    stripe_customer_id: record.stripe_customer_id,
    features: record.features,
    metadata: record.metadata,
    last_seen_at: record.last_seen_at,
    created_at: record.created_at,
    updated_at: record.updated_at,
    subscription_active: record.subscription_active,
    subscription_start_date: record.subscription_start_date,
    subscription_next_charge: record.subscription_next_charge,
    stripe_subscription_id: record.stripe_subscription_id,
    last_payment_status: record.last_payment_status,
    last_invoice_id: record.last_invoice_id,
    verification_token: record.verification_token,
    has_profile_setup: record.has_profile_setup,
    display_name: record.display_name
  }),
  
  conversations: (record) => ({
    id: record.id,
    user_id: record.user_id,
    title: record.title,
    created_at: record.created_at,
    updated_at: record.updated_at,
    meta: record.meta,
    is_public: record.is_public,
    share_token: record.share_token,
    share_mode: record.share_mode,
    owner_user_id: record.owner_user_id
  }),
  
  messages: (record) => ({
    id: record.id,
    chat_id: record.chat_id,
    role: record.role,
    text: record.text,
    created_at: record.created_at,
    meta: record.meta,
    client_msg_id: record.client_msg_id,
    reply_to_id: record.reply_to_id,
    status: record.status,
    model: record.model,
    token_count: record.token_count,
    latency_ms: record.latency_ms,
    error: record.error,
    updated_at: record.updated_at,
    context_injected: record.context_injected,
    message_number: record.message_number,
    mode: record.mode,
    user_id: record.user_id,
    user_name: record.user_name
  }),
  
  api_usage: (record) => ({
    id: record.id,
    user_id: record.user_id,
    translator_log_id: record.translator_log_id,
    endpoint: record.endpoint,
    report_tier: record.report_tier,
    used_geo_lookup: record.used_geo_lookup,
    unit_price_usd: record.unit_price_usd,
    total_cost_usd: record.total_cost_usd,
    created_at: record.created_at,
    report_price_usd: record.report_price_usd,
    geo_price_usd: record.geo_price_usd,
    request_params: record.request_params
  }),
  
  blog_posts: (record) => ({
    id: record.id,
    title: record.title,
    slug: record.slug,
    content: record.content,
    cover_image_url: record.cover_image_url,
    author_name: record.author_name,
    created_at: record.created_at,
    tags: record.tags,
    published: record.published,
    like_count: record.like_count,
    share_count: record.share_count
  })
};

async function main() {
  console.log('🚀 Starting Supabase to Firebase migration...');
  
  // Check if service account file exists
  if (!fs.existsSync('./firebase-service-account.json')) {
    console.error('❌ Missing firebase-service-account.json file');
    console.log('📝 Download it from Firebase Console > Project Settings > Service Accounts');
    process.exit(1);
  }
  
  // Migrate each table
  const tables = ['profiles', 'conversations', 'messages', 'api_usage', 'blog_posts'];
  
  for (const table of tables) {
    await migrateTable(table, transforms[table]);
  }
  
  console.log('🎉 Migration completed!');
  console.log('📝 Next steps:');
  console.log('1. Deploy Firestore rules: firebase deploy --only firestore:rules');
  console.log('2. Deploy indexes: firebase deploy --only firestore:indexes');
  console.log('3. Update your app to use Firebase SDK');
}

main().catch(console.error);
