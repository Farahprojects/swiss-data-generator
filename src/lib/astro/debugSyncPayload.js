// 60-second verification script for Sync UI debugging
// Paste this in the browser console on the Relationship page

function debugSyncPayload(payload) {
  console.log('=== SYNC PAYLOAD DEBUG ===');
  
  // Check name paths
  console.log('A name (natal):', payload?.natal?.subjects?.person_a?.name);
  console.log('B name (natal):', payload?.natal?.subjects?.person_b?.name);
  console.log('A name (trans):', payload?.transits?.person_a?.name);
  console.log('B name (trans):', payload?.transits?.person_b?.name);

  // Check natal data structure
  console.log('A natal has angles?', !!payload?.natal?.subjects?.person_a?.angles);
  console.log('B natal has angles?', !!payload?.natal?.subjects?.person_b?.angles);
  console.log('A natal has houses?', !!payload?.natal?.subjects?.person_a?.houses);
  console.log('B natal has houses?', !!payload?.natal?.subjects?.person_b?.houses);
  console.log('A natal has planets?', !!payload?.natal?.subjects?.person_a?.planets);
  console.log('B natal has planets?', !!payload?.natal?.subjects?.person_b?.planets);

  // Check transit data structure
  console.log('A trans has planets?', !!payload?.transits?.person_a?.planets);
  console.log('B trans has planets?', !!payload?.transits?.person_b?.planets);
  console.log('A trans has aspects_to_natal?', !!payload?.transits?.person_a?.aspects_to_natal);
  console.log('B trans has aspects_to_natal?', !!payload?.transits?.person_b?.aspects_to_natal);

  // Check meta data
  console.log('Meta date:', payload?.meta?.date);
  console.log('Meta time:', payload?.meta?.time);
  console.log('Time basis:', payload?.meta?.time_basis);

  // Check synastry/composite
  console.log('Has synastry aspects?', !!payload?.synastry_aspects?.pairs);
  console.log('Has composite planets?', !!payload?.composite_chart?.planets);

  console.log('=== END DEBUG ===');
}

// Usage examples:
// debugSyncPayload(window.__ASTRO_SYNC_PAYLOAD__);
// debugSyncPayload(payload);
// debugSyncPayload(swissData);

window.debugSyncPayload = debugSyncPayload;
