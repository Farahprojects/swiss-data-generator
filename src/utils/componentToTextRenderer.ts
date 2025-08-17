
import { ReportData } from './reportContentExtraction';

import { isSynastryData, parseAstroData } from '@/lib/synastryFormatter';

const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  
  // Use report_type from metadata for accurate routing
  const reportType = reportData.metadata?.report_type || reportData.guest_report?.report_type;
  console.log('🔍 [isSynastryReport] report_type:', reportType);
  
  // Route based on report type:
  // - 'essence' = single person (individual parser)
  // - 'sync' = dual person (synastry parser) 
  // - 'monthly' = monthly parser
  if (reportType === 'sync') {
    console.log('🔍 [isSynastryReport] Routing to SYNASTRY (sync report)');
    return true;
  } else if (reportType === 'essence') {
    console.log('🔍 [isSynastryReport] Routing to INDIVIDUAL (essence report)');
    return false;
  } else if (reportType === 'monthly') {
    console.log('🔍 [isSynastryReport] Should route to MONTHLY parser (but using individual for now)');
    return false;
  }
  
  // Fallback to data structure analysis if report_type is missing
  console.log('🔍 [isSynastryReport] No report_type found, falling back to data structure analysis');
  return isSynastryData(reportData.swiss_data);
};

export const renderAstroDataAsText = (reportData: ReportData): string => {
  console.log('🔍 [renderAstroDataAsText] Starting with reportData.swiss_data:', reportData.swiss_data);
  
  if (!reportData.swiss_data) {
    console.warn('❌ [renderAstroDataAsText] No swiss_data available');
    return 'No astronomical data available.';
  }

  try {
    const isSynastry = isSynastryReport(reportData);
    console.log('🔍 [renderAstroDataAsText] isSynastryReport:', isSynastry);
    
    if (isSynastry) {
      console.log('🔍 [renderAstroDataAsText] Routing to renderSynastryAsText');
      return renderSynastryAsText(reportData);
    } else {
      console.log('🔍 [renderAstroDataAsText] Routing to renderIndividualAsText');
      return renderIndividualAsText(reportData);
    }
  } catch (error) {
    console.error('❌ [renderAstroDataAsText] Error rendering astro data as text:', error);
    return 'Error: Unable to process astronomical data.';
  }
};

const renderIndividualAsText = (reportData: ReportData): string => {
  const parsed = parseAstroData(reportData.swiss_data);
  const natal = parsed.natal;
  const reportInfo = reportData.guest_report?.report_data;

  let text = '';

  const name = reportInfo?.name || 'Unknown';
  text += `${name}'s Astro Data\n`;
  text += '='.repeat(name.length + 12) + '\n\n';

  if (reportInfo?.birthDate) text += `Born: ${reportInfo.birthDate}\n`;
  if (reportInfo?.birthLocation) text += `Birth Location: ${reportInfo.birthLocation}\n\n`;

  if (natal?.angles?.length > 0) {
    text += 'CHART ANGLES\n------------\n';
    natal.angles.forEach((angle: any) => {
      const degInt = Math.floor(angle.deg || 0);
      text += `${angle.name}: ${String(degInt)}' in ${angle.sign}\n`;
    });
    text += '\n';
  }

  if (natal?.planets?.length > 0) {
    text += 'NATAL PLANETARY POSITIONS\n-------------------------\n';
    natal.planets.forEach((planet: any) => {
      const degInt = Math.floor(planet.deg || 0);
      const sign = String(planet.sign || '').padEnd(10);
      let line = `${(planet.name || '').padEnd(10)}: ${String(degInt).padStart(2, '0')}° ${sign}`;
      if (planet.house) line += ` (H${planet.house})`;
      if (planet.retrograde) line += ' R';
      text += line + '\n';
    });
    text += '\n';
  }

  if (natal?.aspects?.length > 0) {
    text += 'NATAL ASPECTS\n-------------\n';
    natal.aspects.forEach((aspect: any) => {
      const orb = typeof aspect.orb === 'number' ? aspect.orb.toFixed(2) : 'N/A';
      text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${orb}°)\n`;
    });
    text += '\n';
  }

  return text;
};

const renderSynastryAsText = (reportData: ReportData): string => {
  console.log('🔍 [renderSynastryAsText] Raw swiss_data:', reportData.swiss_data);
  const data = parseAstroData(reportData.swiss_data);
  console.log('🔍 [renderSynastryAsText] Parsed data:', data);
  console.log('🔍 [renderSynastryAsText] Data keys:', Object.keys(data));
  const { natal_set, synastry_aspects } = data;
  console.log('🔍 [renderSynastryAsText] natal_set:', natal_set);
  console.log('🔍 [renderSynastryAsText] synastry_aspects:', synastry_aspects);

  if (!natal_set) {
    console.warn('❌ [renderSynastryAsText] natal_set is missing - returning incomplete message');
    return 'Synastry data is incomplete.';
  }

  const personA = natal_set.personA;
  const personB = natal_set.personB;

  let text = 'Synastry Chart Analysis\n';
  text += '======================\n\n';

  text += `Compatibility Analysis between ${personA.name} and ${personB.name}\n\n`;

  const renderPerson = (person: any) => {
    let personText = `${person.name.toUpperCase()}'S NATAL DATA\n`;
    personText += '-'.repeat(person.name.length + 12) + '\n\n';
    if (person.planets?.length > 0) {
      person.planets.forEach((planet: any) => {
        let line = `${(planet.name || '').padEnd(10)}: ${String(Math.floor(planet.deg)).padStart(2, '0')}° ${planet.sign.padEnd(10)}`;
        if (planet.house) line += ` (H${planet.house})`;
        if (planet.retrograde) line += ' R';
        personText += line + '\n';
      });
      personText += '\n';
    }
    return personText;
  };

  text += renderPerson(personA);
  if (personB) {
    text += renderPerson(personB);
  }

  if (synastry_aspects?.aspects?.length > 0) {
    text += 'SYNASTRY ASPECTS\n';
    text += '----------------\n';
    synastry_aspects.aspects.forEach((aspect: any) => {
      text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orb?.toFixed(2)}°)\n`;
    });
    text += '\n';
  }

  return text;
};

export const renderUnifiedContentAsText = (reportData: ReportData): string => {
  const reportContent = reportData.report_content || '';
  const astroContent = renderAstroDataAsText(reportData);

  if (reportContent && astroContent && astroContent !== 'No astronomical data available.') {
    return `${reportContent}\n\n--- ASTROLOGICAL DATA ---\n\n${astroContent}`;
  }

  return reportContent || astroContent;
};
