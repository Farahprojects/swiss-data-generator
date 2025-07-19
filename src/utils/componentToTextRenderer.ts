
import { ReportData } from './reportContentExtraction';
import { parseSwissDataRich } from './swissFormatter';
import { isSynastryData, parseSynastryRich } from '@/lib/synastryFormatter';

// Helper function to detect synastry reports
const isSynastryReport = (reportData: ReportData): boolean => {
  if (!reportData.swiss_data) return false;
  
  return !!(
    reportData.swiss_data.synastry_aspects ||
    reportData.swiss_data.composite_chart ||
    reportData.swiss_data.person_a ||
    reportData.swiss_data.person_b ||
    reportData.guest_report?.report_data?.secondPersonName
  );
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
  
  // Header
  const name = reportInfo?.name || 'Unknown';
  text += `${name}'s Astro Data\n`;
  text += '=' + '='.repeat(text.length - 1) + '\n\n';
  
  // Chart details
  if (reportInfo?.birthDate) {
    text += `Born: ${reportInfo.birthDate}\n`;
  }
  if (reportInfo?.birthLocation) {
    text += `Birth Location: ${reportInfo.birthLocation}\n`;
  }
  
  const formattedDate = new Date(data.dateISO).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric"
  });
  text += `Analysis Date: ${formattedDate}\n\n`;
  
  // Chart Angles
  if (data.angles?.length > 0) {
    text += 'CHART ANGLES\n';
    text += '------------\n\n';
    data.angles.forEach(angle => {
      text += `${angle.name}: ${String(angle.deg).padStart(2, '0')}°${String(angle.min).padStart(2, '0')}' in ${angle.sign}\n`;
    });
    text += '\n';
  }
  
  // House Cusps
  if (data.houses?.length > 0) {
    text += 'HOUSE CUSPS\n';
    text += '-----------\n\n';
    data.houses.forEach(house => {
      text += `House ${house.number}: ${String(house.deg).padStart(2, '0')}°${String(house.min).padStart(2, '0')}' in ${house.sign}\n`;
    });
    text += '\n';
  }
  
  // Planetary Positions
  if (data.planets?.length > 0) {
    text += 'NATAL PLANETARY POSITIONS\n';
    text += '-------------------------\n\n';
    data.planets.forEach(planet => {
      text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
      if (planet.house) {
        text += ` (House ${planet.house})`;
      }
      if (planet.retro) {
        text += ' (Retrograde)';
      }
      text += '\n';
    });
    text += '\n';
  }
  
  // Natal Aspects
  if (data.aspects?.length > 0) {
    text += 'NATAL ASPECTS\n';
    text += '-------------\n\n';
    data.aspects.forEach(aspect => {
      text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, '0')}')\n`;
    });
    text += '\n';
  }
  
  // Current Transits
  if (data.transits?.planets?.length > 0) {
    text += 'CURRENT TRANSIT POSITIONS\n';
    text += '-------------------------\n\n';
    data.transits.planets.forEach(planet => {
      text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
      if (planet.retro) {
        text += ' (Retrograde)';
      }
      text += '\n';
    });
    text += '\n';
  }
  
  // Transit Aspects
  if (data.transits?.aspects?.length > 0) {
    text += 'TRANSIT ASPECTS TO NATAL\n';
    text += '------------------------\n\n';
    data.transits.aspects.forEach(aspect => {
      text += `${aspect.transitPlanet} ${aspect.type} ${aspect.natalPlanet} (Orb: ${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, '0')}')\n`;
    });
    text += '\n';
  }
  
  return text;
};

const renderSynastryAsText = (reportData: ReportData): string => {
  const data = parseSynastryRich(reportData.swiss_data);
  const reportInfo = reportData.guest_report?.report_data;
  
  let text = 'Synastry Chart Analysis\n';
  text += '======================\n\n';
  
  const personA = reportInfo?.name || 'Person A';
  const personB = reportInfo?.secondPersonName || 'Person B';
  
  text += `Compatibility Analysis between ${personA} and ${personB}\n\n`;
  
  // Person A
  if (data.personA?.planets?.length > 0) {
    text += `${personA.toUpperCase()}'S PLANETS\n`;
    text += '-'.repeat(`${personA}'S PLANETS`.length) + '\n\n';
    
    data.personA.planets.forEach(planet => {
      text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
      if (planet.retro) {
        text += ' (Retrograde)';
      }
      text += '\n';
    });
    text += '\n';
  }
  
  // Person B
  if (data.personB?.planets?.length > 0) {
    text += `${personB.toUpperCase()}'S PLANETS\n`;
    text += '-'.repeat(`${personB}'S PLANETS`.length) + '\n\n';
    
    data.personB.planets.forEach(planet => {
      text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
      if (planet.retro) {
        text += ' (Retrograde)';
      }
      text += '\n';
    });
    text += '\n';
  }
  
  // Synastry Aspects
  if (data.synastry?.length > 0) {
    text += 'SYNASTRY ASPECTS\n';
    text += '----------------\n\n';
    
    data.synastry.forEach(aspect => {
      text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, '0')}')\n`;
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
