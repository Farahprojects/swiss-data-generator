
// Content extraction helpers for raw report data
export interface ReportData {
  guest_report: {
    id: string;
    email: string;
    report_type: string | null;
    swiss_boolean: boolean | null;
    is_ai_report: boolean;
    payment_status: string;
    created_at: string;
    promo_code_used: string | null;
    report_data: any;
  };
  report_content: string | null;
  swiss_data: any | null;
  metadata: {
    is_astro_report: boolean;
    is_ai_report: boolean;
    content_type: 'astro' | 'ai' | 'both' | 'none';
  };
}

export const extractReportContent = (reportData: ReportData): string => {
  return reportData.report_content || '';
};

export const extractAstroContent = (reportData: ReportData): string => {
  if (!reportData.swiss_data) return '';
  
  const swissData = reportData.swiss_data;
  const reportInfo = reportData.guest_report?.report_data;
  let astroText = '';
  
  // Header with birth information
  if (reportInfo) {
    const name = reportInfo.name || 'Unknown';
    const birthDate = reportInfo.birthDate || 'Unknown';
    const birthLocation = reportInfo.birthLocation || 'Unknown';
    const latitude = reportInfo.latitude ? `${reportInfo.latitude}°` : '';
    const longitude = reportInfo.longitude ? `${reportInfo.longitude}°` : '';
    const coordinates = latitude && longitude ? `${latitude}, ${longitude}` : '';
    
    astroText += `ASTROLOGICAL CHART\n\n`;
    astroText += `Name: ${name}\n`;
    astroText += `Birth Date: ${birthDate}\n`;
    astroText += `Birth Location: ${birthLocation}\n`;
    if (coordinates) {
      astroText += `Coordinates: ${coordinates}\n`;
    }
    astroText += `Analysis Date: ${new Date().toLocaleDateString()}\n\n`;
    astroText += '─'.repeat(50) + '\n\n';
  }
  
  // Planetary Positions
  if (swissData.natal?.planets) {
    astroText += 'PLANETARY POSITIONS\n\n';
    Object.entries(swissData.natal.planets).forEach(([planet, data]: [string, any]) => {
      const sign = data.sign || '';
      const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
      const house = data.house ? ` (House ${data.house})` : '';
      astroText += `${planet.padEnd(12)} ${degree}° ${sign}${house}\n`;
    });
    astroText += '\n';
  }
  
  // Major Aspects
  if (swissData.natal?.aspects) {
    astroText += 'MAJOR ASPECTS\n\n';
    Object.entries(swissData.natal.aspects).forEach(([aspectKey, data]: [string, any]) => {
      const orb = data.orb ? Math.round(data.orb * 100) / 100 : '';
      const aspect = data.aspect || aspectKey;
      const planet1 = data.planet1 || '';
      const planet2 = data.planet2 || '';
      
      if (planet1 && planet2 && aspect) {
        astroText += `${planet1.padEnd(10)} ${aspect.padEnd(12)} ${planet2.padEnd(10)} ${orb}°\n`;
      } else {
        astroText += `${aspectKey}: ${orb}° orb\n`;
      }
    });
    astroText += '\n';
  }
  
  // House Cusps
  if (swissData.natal?.houses) {
    astroText += 'HOUSE CUSPS\n\n';
    Object.entries(swissData.natal.houses).forEach(([house, data]: [string, any]) => {
      const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
      const sign = data.sign || '';
      astroText += `House ${house.padEnd(2)}     ${degree}° ${sign}\n`;
    });
    astroText += '\n';
  }
  
  // Chart Angles
  if (swissData.natal?.angles) {
    astroText += 'CHART ANGLES\n\n';
    Object.entries(swissData.natal.angles).forEach(([angle, data]: [string, any]) => {
      const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
      const sign = data.sign || '';
      astroText += `${angle.padEnd(12)} ${degree}° ${sign}\n`;
    });
    astroText += '\n';
  }
  
  // Current Transits
  if (swissData.transits?.planets) {
    astroText += 'CURRENT TRANSITS\n\n';
    Object.entries(swissData.transits.planets).forEach(([planet, data]: [string, any]) => {
      const degree = data.degree ? Math.round(data.degree * 100) / 100 : '';
      const sign = data.sign || '';
      astroText += `${planet.padEnd(12)} ${degree}° ${sign}\n`;
    });
    astroText += '\n';
  }
  
  return astroText;
};

export const extractUnifiedContent = (reportData: ReportData): string => {
  const reportContent = extractReportContent(reportData);
  const astroContent = extractAstroContent(reportData);
  
  if (reportContent && astroContent) {
    return `${reportContent}\n\n--- ASTROLOGICAL DATA ---\n\n${astroContent}`;
  }
  
  return reportContent || astroContent;
};

export const getPersonName = (reportData: ReportData): string => {
  return reportData.guest_report?.report_data?.name || 'Unknown';
};

export const getReportTitle = (reportData: ReportData): string => {
  const personA = reportData.guest_report?.report_data?.name;
  const personB = reportData.guest_report?.report_data?.secondPersonName;
  const reportType = reportData.guest_report?.report_type || '';
  
  if (personB) {
    return `${personA} × ${personB}`;
  }
  
  return `${personA} – ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`;
};
