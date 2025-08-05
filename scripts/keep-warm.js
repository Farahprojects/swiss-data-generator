#!/usr/bin/env node

/**
 * Keep Warm Script
 * Calls the keep-warm edge function every 30 seconds to keep all edge functions warm
 */

const KEEP_WARM_URL = process.env.KEEP_WARM_URL || "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/keep-warm";
const PING_INTERVAL = 30000; // 30 seconds

console.log(`🔥 Keep Warm Service Starting...`);
console.log(`📡 Target URL: ${KEEP_WARM_URL}`);
console.log(`⏰ Ping Interval: ${PING_INTERVAL / 1000} seconds`);
console.log(`🚀 Starting in 5 seconds...\n`);

// Wait 5 seconds before starting
setTimeout(() => {
  startKeepWarm();
}, 5000);

function startKeepWarm() {
  console.log(`🔄 Starting keep-warm service...\n`);
  
  // Initial ping
  pingKeepWarm();
  
  // Set up interval
  setInterval(pingKeepWarm, PING_INTERVAL);
}

async function pingKeepWarm() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`📡 [${timestamp}] Pinging keep-warm service...`);
    
    const response = await fetch(KEEP_WARM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        trigger: "keep-warm-script",
        timestamp: timestamp,
      }),
    });
    
    const duration = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [${timestamp}] Keep-warm successful (${duration}ms)`);
      console.log(`📊 Summary: ${data.summary?.successful || 0}/${data.summary?.total || 0} functions warmed`);
      
      // Log any failed functions
      if (data.summary?.failed > 0) {
        console.log(`⚠️  Failed functions:`);
        Object.entries(data.summary?.results || {}).forEach(([name, result]) => {
          if (!result.success) {
            console.log(`   ❌ ${name}: ${result.error}`);
          }
        });
      }
    } else {
      console.error(`❌ [${timestamp}] Keep-warm failed: HTTP ${response.status}`);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [${timestamp}] Keep-warm error (${duration}ms):`, error.message);
  }
  
  console.log(`⏰ Next ping in ${PING_INTERVAL / 1000} seconds...\n`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n🛑 Keep Warm Service stopping...`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n🛑 Keep Warm Service stopping...`);
  process.exit(0);
}); 