// ============================================================================
//  process-guest-report-pdf.ts
//  Generates a PDF for a guest report and forwards a full email payload
//  (template name, rendered HTML/text, + attachments) to the send-email
//  edge-function.  No direct SMTP interaction lives here any more.
// ============================================================================

// @deno-types="https://esm.sh/@types/jspdf@2.5.1"
import jsPDF from "https://esm.sh/jspdf@2.5.1";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── ENV VARS ────────────────────────────────────────────────────────────────
const SUPABASE_URL           = Deno.env.get("SUPABASE_URL")              ?? "";
const SUPABASE_SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ─── CORS HEADERS ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────────────────────────────────────
//  PDF-generation helpers
// ─────────────────────────────────────────────────────────────────────────────
class ServerPdfGenerator {
  static generateReportPdf(reportData: any, logPrefix: string): string {
    console.log(`${logPrefix} Starting PDF generation`);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };

    // ── metadata + header
    doc.setProperties({
      title: "Therai Report",
      subject: "Client Energetic Insight",
      author: "Therai",
      creator: "PDF Generator Service",
    });

    doc.setFontSize(26).setFont("times", "bold").text("Therai.", pageW / 2, 32, { align: "center" });
    
    const reportTitle = this.getReportTitle(reportData.reportType);
    doc.setFontSize(20).setFont("helvetica", "bold")
       .text(reportTitle, pageW / 2, 48, { align: "center" });
    
    if (reportData.customerName) {
        doc.setFontSize(14).setFont("helvetica", "normal");
        doc.text(`For: ${reportData.customerName}`, pageW / 2, 58, { align: 'center' });
    }

    // ── meta
    let y = 75;
    doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(100);
    doc.text("Report ID:", margins.left, y);
    doc.setFont("helvetica", "bold")
       .text(reportData.id.substring(0,8), margins.left+40, y);
    y += 6;
    doc.setFont("helvetica", "normal").text("Generated At:", margins.left, y);
    doc.setFont("helvetica", "bold").text(reportData.generatedAt, margins.left+40, y);
    y += 12;
    
    // ── body content
    if (reportData.content) {
        doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(75,63,114);
        doc.text("Client Energetic Insight", margins.left, y);
        y += 12;

        doc.setFontSize(11).setFont("helvetica", "normal").setTextColor(33);
        const reportText = doc.splitTextToSize(reportData.content, pageW - margins.left - margins.right);
        
        let lineY = y;
        const lineH = 7.2;
        const footerPad = 20;
        const newPage = () => { doc.addPage(); lineY = margins.top; };
        const ensure = (extra = 0) => (lineY + extra > pageH - footerPad) && newPage();

        reportText.forEach((line: string) => {
          ensure(lineH);
          doc.text(line, margins.left, lineY);
          lineY += lineH;
        });
    }

    // ── return base-64
    const dataUri = doc.output("datauristring");
    return dataUri.split(",")[1] ?? "";
  }

  static getReportTitle(reportType?: string): string {
    if (!reportType) return "Intelligence Report";
    
    const reportTitles: Record<string, string> = {
      'essence_personal': 'Essence Report (Personal)',
      'essence_business': 'Essence Report (Business)',
      'sync_personal': 'Synastry Report (Personal)',
      'sync_business': 'Synastry Report (Business)',
      'focus_personal': 'Focus Report (Personal)',
      'focus_business': 'Focus Report (Business)',
      'flow_personal': 'Flow Report (Personal)',
      'flow_business': 'Flow Report (Business)',
      'default': 'Intelligence Report'
    };
    
    return reportTitles[reportType.toLowerCase()] || reportTitles['default'];
  }
}

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── MAIN WORK ────────────────────────────────────────────────────────────────
async function processGuestReportPdf(guestReportId: string, requestId: string, recipientEmail?: string) {
  const log = (msg: string) => console.log(`[process-guest-report-pdf][${requestId}] ${msg}`);

  // FIRST THING: Mark that the edge function was called
  try {
    await supabase
      .from("guest_reports")
      .update({ edge_function_confirmed: true })
      .eq("id", guestReportId);
    log("Edge function confirmed in database");
  } catch (error) {
    log(`Failed to confirm edge function call: ${error}`);
  }

  // 1. fetch report data
  const { data: gr, error } = await supabase
    .from("guest_reports")
    .select("id, email, report_type, created_at, email_sent, email_sent_at, report_data")
    .eq("id", guestReportId)
    .single();
  if (error || !gr) throw new Error(`Guest report not found: ${error?.message}`);

  // 2. fetch report content from report_logs where user_id = guestReportId
  const { data: reportLog, error: reportLogError } = await supabase
    .from("report_logs")
    .select("report_text")
    .eq("user_id", guestReportId)
    .single();
  
  if (reportLogError) {
    log(`Report content not found for ${guestReportId}, proceeding with empty PDF.`);
  }
  
  const reportContent = reportLog?.report_text;

  if (!reportContent) {
      throw new Error("No content available to generate PDF (no AI text found).");
  }
  if (gr.email_sent) { log("Email already sent – skipping"); return { skipped:true, sentAt: gr.email_sent_at }; }

  // 4. generate PDF
  const pdfBase64 = ServerPdfGenerator.generateReportPdf({
    id: gr.id,
    content: reportContent,
    generatedAt: new Date(gr.created_at).toLocaleDateString(),
    reportType: gr.report_type,
    customerName: gr.report_data?.name || gr.report_data?.person_a?.name || gr.email,
  }, requestId);
  if (!pdfBase64) throw new Error("PDF generation failed");
  
  log(`PDF generated successfully, size: ${pdfBase64.length} chars`);

  // 5. Save PDF to database
  try {
    await supabase
      .from("guest_reports")
      .update({ report_pdf_data: pdfBase64 })
      .eq("id", guestReportId);
    log("PDF data saved to database");
  } catch (error) {
    log(`Failed to save PDF to database: ${error}`);
    throw new Error(`Failed to save PDF: ${error}`);
  }

  const filename = `energetic-report-${gr.report_type}-${gr.id.substring(0,8)}.pdf`;

  // 4. fetch email template
  const { data: tmpl, error: tmplErr } = await supabase
    .from("email_notification_templates")
    .select("subject, body_html, body_text")
    .eq("template_type", "report_delivery")
    .single();
  if (tmplErr || !tmpl) throw new Error(`Template fetch failed: ${tmplErr?.message}`);

  // 5. build payload for send-email edge-function
  const emailPayload = {
    template_type: "report_delivery",      // easier debugging / future use
    to: recipientEmail || gr.email,
    subject: tmpl.subject,
    html: tmpl.body_html,
    text: tmpl.body_text ?? "",
    from: "Theria Astro <no-reply@theraiastro.com>",
    attachments: [{
      filename,
      content: pdfBase64,
      mimetype: "application/pdf",
      encoding: "base64",
    }],
  };

  // 6. Call send-email edge-function directly
  const sendEmailUrl = `${SUPABASE_URL}/functions/v1/send-email`;
  log(`Calling send-email function at: ${sendEmailUrl}`);
  
  const res = await fetch(sendEmailUrl, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify(emailPayload),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    log(`send-email failed: ${res.status} ${errorText}`);
    throw new Error(`send-email failed: ${res.status} ${errorText}`);
  }

  log("Email sent successfully via send-email function");

  // 7. mark as sent
  await supabase.from("guest_reports")
    .update({ email_sent: true, email_sent_at: new Date().toISOString() })
    .eq("id", guestReportId);

  log("PDF created and email sent successfully");
  return { success: true, filename, pdfSize: pdfBase64.length };
}

// ─── HTTP HANDLER ─────────────────────────────────────────────────────────────
serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST")    return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

  const requestId = crypto.randomUUID().substring(0,8);

  try {
    const { guest_report_id, email } = await req.json();
    if (!guest_report_id) return new Response(
      JSON.stringify({ error: "guest_report_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

    const result = await processGuestReportPdf(guest_report_id, requestId, email);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      requestId,
      error: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

console.log("[process-guest-report-pdf] Edge function ready and listening for requests...");