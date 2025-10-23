import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { ReportFormData } from '@/types/public-report';

export const useAstroReportPayload = () => {
  const { user } = useAuth();
  const { mode: contextMode } = useMode();

  const validateDateFormat = (dateStr: string, fieldName: string): string => {
    if (!dateStr) {
      throw new Error(`${fieldName} is required`);
    }
    
    // Expect YYYY-MM-DD format (10 chars, 2 hyphens)
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(dateStr)) {
      throw new Error(`${fieldName} must be in YYYY-MM-DD format, got: ${dateStr}`);
    }
    
    // Validate it's a real date
    const date = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(date.getTime())) {
      throw new Error(`${fieldName} is not a valid date: ${dateStr}`);
    }
    
    return dateStr;
  };

  const buildReportPayload = (data: ReportFormData, selectedAstroType: string) => {
    const personA: any = {
      birth_date: validateDateFormat(data.birthDate, 'Birth date'),
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
        birth_date: validateDateFormat(data.secondPersonBirthDate, 'Second person birth date'),
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
