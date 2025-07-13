import { parseSwissDataRich } from './swissFormatter';
import { isSynastryData, parseSynastryRich } from '@/lib/synastryFormatter';

export const extractAstroDataAsText = (swissData: any, reportData?: any): string => {
  if (!swissData) {
    return 'No astronomical data available.';
  }

  try {
    // Check if this is synastry data
    if (isSynastryData(swissData)) {
      return extractSynastryText(swissData, reportData);
    }

    // Parse single natal chart data
    const data = parseSwissDataRich(swissData);
    
    let text = '';
    
    // Header section
    const personName = reportData?.people?.A?.name || reportData?.customerName || reportData?.name || reportData?.firstName;
    text += `${personName ? `${personName}'s ` : ''}Astro Data\n`;
    text += '=' + '='.repeat(text.length - 1) + '\n\n';
    
    // Birth details
    if (reportData?.people?.A?.birthDate || reportData?.birthDate) {
      text += `Born: ${reportData?.people?.A?.birthDate || reportData?.birthDate}\n`;
    }
    if (reportData?.people?.A?.location || reportData?.birthLocation) {
      text += `Birth Location: ${reportData?.people?.A?.location || reportData?.birthLocation}\n`;
    }
    
    // Analysis details
    const formattedDate = new Date(data.dateISO).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    text += `Analysis Date: ${formattedDate}\n`;
    
    if (data.meta?.location) {
      text += `Calculation Location: ${data.meta.location}`;
      if (data.meta.lat && data.meta.lon) {
        text += ` (${data.meta.lat.toFixed(2)}°, ${data.meta.lon.toFixed(2)}°)`;
      }
      text += '\n';
    }
    
    text += '\n';
    
    // Planetary positions
    if (data.planets.length > 0) {
      text += 'PLANETARY POSITIONS\n';
      text += '-------------------\n\n';
      
      data.planets.forEach(planet => {
        text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
        if (planet.retro) {
          text += ' (Retrograde)';
        }
        text += '\n';
      });
      
      text += '\n';
    }
    
    // Aspects
    if (data.aspects.length > 0) {
      text += 'ASPECTS TO NATAL\n';
      text += '----------------\n\n';
      
      data.aspects.forEach(aspect => {
        text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, '0')}')\n`;
      });
      
      text += '\n';
    }
    
    return text;
    
  } catch (error) {
    console.error('Error extracting astro data as text:', error);
    return 'Error: Unable to process astronomical data.';
  }
};

const extractSynastryText = (swissData: any, reportData?: any): string => {
  try {
    const data = parseSynastryRich(swissData);
    
    let text = 'Synastry Chart Analysis\n';
    text += '======================\n\n';
    
    text += `Compatibility Analysis between ${data.personA.label} and ${data.personB.label}\n\n`;
    
    // Add birth details if available
    if (reportData?.people?.A?.birthDate) {
      text += `${data.personA.label} - Born: ${reportData.people.A.birthDate}`;
      if (reportData.people.A.location) {
        text += ` in ${reportData.people.A.location}`;
      }
      text += '\n';
    }
    
    if (reportData?.people?.B?.birthDate) {
      text += `${data.personB.label} - Born: ${reportData.people.B.birthDate}`;
      if (reportData.people.B.location) {
        text += ` in ${reportData.people.B.location}`;
      }
      text += '\n';
    }
    
    text += '\n';
    
    // Person A planets
    if (data.personA.planets.length > 0) {
      text += `${data.personA.label.toUpperCase()}'S PLANETS\n`;
      text += '-'.repeat(`${data.personA.label}'S PLANETS`.length) + '\n\n';
      
      data.personA.planets.forEach(planet => {
        text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
        if (planet.retro) {
          text += ' (Retrograde)';
        }
        text += '\n';
      });
      text += '\n';
    }
    
    // Person B planets
    if (data.personB.planets.length > 0) {
      text += `${data.personB.label.toUpperCase()}'S PLANETS\n`;
      text += '-'.repeat(`${data.personB.label}'S PLANETS`.length) + '\n\n';
      
      data.personB.planets.forEach(planet => {
        text += `${planet.name}: ${String(planet.deg).padStart(2, '0')}°${String(planet.min).padStart(2, '0')}' in ${planet.sign}`;
        if (planet.retro) {
          text += ' (Retrograde)';
        }
        text += '\n';
      });
      text += '\n';
    }
    
    // Synastry aspects
    if (data.synastry.length > 0) {
      text += 'SYNASTRY ASPECTS\n';
      text += '----------------\n\n';
      
      data.synastry.forEach(aspect => {
        text += `${aspect.a} ${aspect.type} ${aspect.b} (Orb: ${aspect.orbDeg}°${String(aspect.orbMin).padStart(2, '0')}')\n`;
      });
      text += '\n';
    }
    
    return text;
    
  } catch (error) {
    console.error('Error extracting synastry text:', error);
    return 'Error: Unable to process synastry data.';
  }
};