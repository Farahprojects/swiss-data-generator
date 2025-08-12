
import { ReportData } from './reportContentExtraction';
import { parseSwissDataRich } from './swissFormatter';
import { isSynastryData, parseAstroData } from '@/lib/synastryFormatter';

const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  return isSynastryData(reportData.swiss_data);
};

export const renderAstroDataAsText = (reportData: ReportData): string => {
  if (!reportData.swiss_data) {
    return 'No astronomical data available.';
  }

  try {
    if (isSynastryReport(reportData)) {
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
  const data = parseSwissDataRich(reportData.swiss_data);
  const reportInfo = reportData.guest_report?.report_data;

  let text = '';

  const name = reportInfo?.name || 'Unknown';
  text += `${name}'s Astro Data\n`;
  text += '='.repeat(name.length + 12) + '\n\n';

  if (reportInfo?.birthDate) text += `Born: ${reportInfo.birthDate}\n`;
  if (reportInfo?.birthLocation) text += `Birth Location: ${reportInfo.birthLocation}\n\n`;

  if (data.angles?.length > 0) {
    text += 'CHART ANGLES\n------------\n';
    data.angles.forEach((angle: any) => {
      text += `${angle.name}: ${String(Math.floor(angle.deg))}' in ${angle.sign}\n`;
    });
    text += '\n';
  }

  if (data.planets?.length > 0) {
    text += 'NATAL PLANETARY POSITIONS\n-------------------------\n';
    data.planets.forEach((planet: any) => {
      let line = `${(planet.name || '').padEnd(10)}: ${String(Math.floor(planet.deg)).padStart(2, '0')}° ${planet.sign.padEnd(10)}`;
      if (planet.house) line += ` (H${planet.house})`;
      if (planet.retrograde) line += ' R';
      text += line + '\n';
    });
    text += '\n';
  }

  if (data.aspects?.length > 0) {
    text += 'NATAL ASPECTS\n-------------\n';
    data.aspects.forEach((aspect: any) => {
      text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orb?.toFixed(2)}°)\n`;
    });
    text += '\n';
  }

  return text;
};

const renderSynastryAsText = (reportData: ReportData): string => {
  const data = parseAstroData(reportData.swiss_data);
  const { natal_set, synastry_aspects } = data;

  if (!natal_set) return 'Synastry data is incomplete.';

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
