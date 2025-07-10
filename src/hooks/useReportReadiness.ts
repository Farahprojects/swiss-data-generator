import { useState, useEffect } from 'react';
import { checkReportReadiness } from '@/utils/reportStatusChecker';

export const useReportReadiness = (
  report: any,
  fetchedReportData: any,
  reportType?: string
) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const ready = checkReportReadiness(
      report,
      fetchedReportData,
      reportType as 'essence' | 'sync'
    );
    setIsReady(ready);
  }, [report, fetchedReportData, reportType]);

  return isReady;
};