// Quick tests for astro position formatting utilities

import { formatDegMin, formatPos, formatPosWithHouse } from '../format';

// Test formatDegMin function
console.log('=== formatDegMin Tests ===');
console.log('11.83 →', formatDegMin(11.83)); // Should be "11°49'"
console.log('27.06 →', formatDegMin(27.06)); // Should be "27°03'"
console.log('0.00 →', formatDegMin(0.00));   // Should be "0°00'"
console.log('29.99 →', formatDegMin(29.99)); // Should be "29°59'"
console.log('undefined →', formatDegMin(undefined)); // Should be "—"
console.log('null →', formatDegMin(null as any)); // Should be "—"
console.log('NaN →', formatDegMin(NaN)); // Should be "—"

// Test formatPos function
console.log('\n=== formatPos Tests ===');
console.log('Valid position →', formatPos({ deg: 11.83, sign: 'Gemini' })); // Should be "11°49' in Gemini"
console.log('Missing deg →', formatPos({ sign: 'Gemini' })); // Should be "—"
console.log('Missing sign →', formatPos({ deg: 11.83 })); // Should be "—"
console.log('Empty object →', formatPos({})); // Should be "—"
console.log('Undefined →', formatPos(undefined)); // Should be "—"

// Test formatPosWithHouse function
console.log('\n=== formatPosWithHouse Tests ===');
console.log('With house →', formatPosWithHouse({ deg: 11.83, sign: 'Gemini', house: 7 })); 
// Should be "11°49' in Gemini (House 7)"
console.log('With natal house →', formatPosWithHouse({ deg: 11.83, sign: 'Gemini', natal_house: 1 })); 
// Should be "11°49' in Gemini (Natal House 1)"
console.log('No house →', formatPosWithHouse({ deg: 11.83, sign: 'Gemini' })); 
// Should be "11°49' in Gemini"
console.log('Invalid data with house →', formatPosWithHouse({ house: 7 })); 
// Should be "—"

console.log('\n=== All tests completed ===');
