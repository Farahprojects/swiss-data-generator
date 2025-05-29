
export const isFailedLog = (status: number): boolean => {
  return status >= 400;
};

export const formatTypeValue = (type: string | null): string => {
  if (!type) return 'None';
  // Ensure first letter is capitalized
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export const hasValidReport = (log: any): boolean => {
  return !!log.report_tier && !isFailedLog(log.response_status);
};
