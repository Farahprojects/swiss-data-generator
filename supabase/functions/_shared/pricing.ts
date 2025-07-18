
export function transformToTranslatorPayload(productRow: any, reportData: any): any {
  const reportType = productRow.report_type;
  const endpoint = productRow.endpoint;

  // Map endpoint for AI reports - translator expects base endpoint, not generic "report"
  let requestEndpoint = endpoint;
  if (endpoint === 'report' && reportType) {
    // Map report types to their base endpoints
    if (reportType.startsWith('essence')) requestEndpoint = 'essence';
    else if (reportType.startsWith('sync')) requestEndpoint = 'sync';
    else if (reportType === 'flow') requestEndpoint = 'flow';
    else if (reportType === 'mindset') requestEndpoint = 'mindset';
    else if (reportType === 'monthly') requestEndpoint = 'monthly';
    else if (reportType === 'focus') requestEndpoint = 'focus';
    else if (reportType === 'return') requestEndpoint = 'return';
  }

  const basePayload: any = {
    request: requestEndpoint,
    source: 'guest'
  };

  // Handle moonphases report
  if (endpoint === 'moonphases') {
    if (reportData.returnYear) {
      basePayload.year = parseInt(reportData.returnYear);
    }
    return basePayload;
  }

  // Handle positions report
  if (endpoint === 'positions') {
    basePayload.location = reportData.birthLocation;
    basePayload.date = reportData.birthDate;
    return basePayload;
  }

  // Person-based reports - Map field names to Swiss API format
  if (reportData.name && reportData.birthDate && reportData.birthTime && reportData.birthLocation) {
    basePayload.name = reportData.name;
    basePayload.birth_date = reportData.birthDate;
    basePayload.time = reportData.birthTime;
    basePayload.location = reportData.birthLocation;
  }

  // Add timing fields if present
  if (reportData.birthLatitude) basePayload.latitude = parseFloat(reportData.birthLatitude);
  if (reportData.birthLongitude) basePayload.longitude = parseFloat(reportData.birthLongitude);
  if (reportData.returnYear) basePayload.return_date = reportData.returnYear;

  // Handle two-person reports (sync, compatibility)
  if ((requestEndpoint === 'sync' || requestEndpoint === 'compatibility') && reportData.secondPersonName) {
    basePayload.person_a = {
      name: reportData.name,
      birth_date: reportData.birthDate,
      time: reportData.birthTime,
      location: reportData.birthLocation
    };
    basePayload.person_b = {
      name: reportData.secondPersonName,
      birth_date: reportData.secondPersonBirthDate,
      time: reportData.secondPersonBirthTime,
      location: reportData.secondPersonBirthLocation
    };

    // Add coordinates if available
    if (reportData.birthLatitude) basePayload.person_a.latitude = parseFloat(reportData.birthLatitude);
    if (reportData.birthLongitude) basePayload.person_a.longitude = parseFloat(reportData.birthLongitude);
    if (reportData.secondPersonLatitude) basePayload.person_b.latitude = parseFloat(reportData.secondPersonLatitude);
    if (reportData.secondPersonLongitude) basePayload.person_b.longitude = parseFloat(reportData.secondPersonLongitude);

    // Remove individual fields for two-person reports
    delete basePayload.name;
    delete basePayload.birth_date;
    delete basePayload.time;
    delete basePayload.location;
    delete basePayload.latitude;
    delete basePayload.longitude;
  }

  // Raw chart requests (astro-only endpoints) - no report type
  if (!reportType) {
    return basePayload;
  }

  // AI report-generating payloads - add report field based on type
  if (reportType === 'essence' && reportData.essenceType) {
    // Map essence types correctly
    if (reportData.essenceType === 'personal-identity') {
      basePayload.report = 'essence_personal';
    } else if (reportData.essenceType === 'professional') {
      basePayload.report = 'essence_professional';
    } else if (reportData.essenceType === 'relational') {
      basePayload.report = 'essence_relational';
    } else {
      basePayload.report = `essence_${reportData.essenceType}`;
    }
  } else if (reportType.startsWith('sync') && reportData.relationshipType) {
    basePayload.report = `sync_${reportData.relationshipType}`;
  } else {
    // For other report types, use the report type directly
    const reportGeneratingTypes = ['return', 'essence', 'flow', 'mindset', 'monthly', 'focus'];
    if (reportGeneratingTypes.includes(reportType)) {
      basePayload.report = reportType;
    }
  }

  return basePayload;
}

export async function buildTranslatorPayload(productId: string, reportData: any, supabase: any) {
  const { data: priceRow, error } = await supabase
    .from("price_list")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !priceRow) {
    throw new Error(`Unable to find product in price_list for id: ${productId}`);
  }

  return { 
    payload: transformToTranslatorPayload(priceRow, reportData),
    isAiReport: priceRow.endpoint === "report",
    product: priceRow
  };
}

export function determineProductId(reportData: any): string {
  // Determine priceId based on report type
  if (reportData.reportType === 'essence' || reportData.essenceType) {
    return 'essence';
  } else if (reportData.reportType === 'sync' || reportData.relationshipType) {
    return 'sync';
  } else if (reportData.reportType === 'flow') {
    return 'flow';
  } else if (reportData.reportType === 'mindset') {
    return 'mindset';
  } else if (reportData.reportType === 'monthly') {
    return 'monthly';
  } else if (reportData.reportType === 'focus') {
    return 'focus';
  } else if (reportData.reportType === 'return') {
    return 'return';
  } else {
    return 'essence'; // Default fallback
  }
}
