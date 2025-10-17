import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { ReportFormData } from '@/types/public-report';

export const useAstroReportPayload = () => {
  const { user } = useAuth();
  const { mode: contextMode } = useMode();

  const convertDateFormat = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    if (dateStr.includes('-') && dateStr.length === 10) return dateStr;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const [day, month, year] = parts;
        return `${year}-${month}-${day}`;
      }
    }
    return dateStr;
  };

  const buildReportPayload = (data: ReportFormData, selectedAstroType: string) => {
    const personA: any = {
      birth_date: convertDateFormat(data.birthDate),
      birth_time: data.birthTime,
      location: data.birthLocation,
      latitude: data.birthLatitude,
      longitude: data.birthLongitude,
      name: data.name,
    };

    if (data.timezone) personA.timezone = data.timezone;
    if (data.houseSystem) personA.house_system = data.houseSystem;

    const reportData: any = {
      request: data.request || selectedAstroType,
      reportType: data.reportType,
      person_a: personA,
    };

    // Add person_b for compatibility requests
    if (selectedAstroType === 'sync' && data.secondPersonName) {
      const personB: any = {
        birth_date: convertDateFormat(data.secondPersonBirthDate),
        birth_time: data.secondPersonBirthTime,
        location: data.secondPersonBirthLocation,
        latitude: data.secondPersonLatitude,
        longitude: data.secondPersonLongitude,
        name: data.secondPersonName,
      };

      if (data.secondPersonTimezone) personB.timezone = data.secondPersonTimezone;
      if (data.secondPersonHouseSystem) personB.house_system = data.secondPersonHouseSystem;

      reportData.person_b = personB;
    }

    return {
      report_data: reportData,
      email: user?.email || '',
      name: data.name,
      mode: contextMode || 'chat',
    };
  };

  return { buildReportPayload };
};
