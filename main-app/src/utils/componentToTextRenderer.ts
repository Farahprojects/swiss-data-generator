
import { ReportData } from './reportContentExtraction';

import { isSynastryData, parseAstroData } from '@/lib/astroFormatter';

const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;

  // Use report_type from metadata/guest_report for accurate routing
  const reportTypeRaw = reportData.metadata?.report_type || reportData.guest_report?.report_type || '';
  const reportType = String(reportTypeRaw).toLowerCase();

  // Route based on explicit type first
  if (reportType.includes('sync') || reportType.includes('synastry')) {
    return true;
  }
  if (reportType.startsWith('essence') || reportType.includes('personal') || reportType === 'essence') {
    return false;
  }
  if (reportType === 'monthly' || reportType.startsWith('month')) {
    return false;
  }

  // Fallback to structural detection
  return isSynastryData(reportData.swiss_data);
};

export const renderAstroDataAsText = (reportData: ReportData): string => {
  if (!reportData.swiss_data) {
    return 'No astronomical data available.';
  }

  try {
    const isSynastry = isSynastryReport(reportData);
    
    if (isSynastry) {
      return renderSynastryAsText(reportData);
    } else {
      return renderIndividualAsText(reportData);
    }
  } catch (error) {
    console.error('Error rendering astro data as text:', error);
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
  const data = parseAstroData(reportData.swiss_data);
  const { natal_set, synastry_aspects } = data;

  if (!natal_set) {
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
