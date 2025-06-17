import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SMTP_ENDPOINT = Deno.env.get("THERIA_SMTP_ENDPOINT") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Server-side ReportParser (adapted from frontend)
class ServerReportParser {
  static cleanContent(content: string): string {
    return content
      .replace(/<[^>]*>/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/[_`]/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }

  static isHeading(line: string): boolean {
    const t = line.toLowerCase().trim();
    const h = ['summary','insights','actions','tags','conclusion','recommendations','overview','analysis','findings','key points','next steps','takeaways'];
    return line.length < 60 && h.some(s => t === s || t === `${s}:` || t.startsWith(`${s}:`));
  }

  static processBlocks(content: string): Array<{type: string, text: string}> {
    const lines = content.split(/\r?\n/);
    const out: Array<{type: string, text: string}> = [];

    lines.forEach(raw => {
      const line = raw.trim();
      if (line === '') {
        out.push({ type: 'spacer', text: '' });
        return;
      }
      const lower = line.toLowerCase();

      if (this.isHeading(line)) {
        out.push({ type: 'heading', text: line });
        return;
      }
      if (lower.startsWith('positivetags:') || lower.startsWith('negativetags:')) {
        const lbl = lower.startsWith('positivetags:') ? 'Positive Traits' : 'Negative Traits';
        out.push({ type: 'heading', text: lbl });
        line.split(':')[1].split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
          out.push({ type: 'tag', text: `• ${tag}` });
        });
        return;
      }
      if (/^\d+\.\s/.test(line)) {
        out.push({ type: 'action', text: line });
        return;
      }
      out.push({ type: 'normal', text: line });
    });
    return out;
  }

  static parseReport(content: string): Array<{type: string, text: string}> {
    const cleaned = this.cleanContent(content);
    return this.processBlocks(cleaned);
  }
}

// Server-side PDF Generator (adapted from frontend)
class ServerPdfGenerator {
  static generateReportPdf(reportData: any): string {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { top: 20, right: 20, bottom: 20, left: 20 };

    // Set metadata
    doc.setProperties({
      title: 'Essence Professional',
      subject: 'Client Energetic Insight',
      author: 'Theria Astro',
      creator: 'PDF Generator Service'
    });

    // Header
    const logoY = 20;
    doc.setFontSize(26).setFont('times', 'bold').setTextColor(40, 40, 60);
    doc.text('Therai.', pageWidth / 2, logoY + 12, { align: 'center' });

    doc.setFontSize(20).setFont('helvetica', 'bold');
    doc.text('Intelligence Report', pageWidth / 2, logoY + 28, { align: 'center' });

    // Meta information
    let y = logoY + 40;
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
    doc.text('Report ID:', margins.left, y);
    doc.setFont('helvetica', 'bold').text(reportData.id.substring(0, 8), margins.left + 40, y);

    doc.setFont('helvetica', 'normal');
    y += 6;
    doc.text('Generated At:', margins.left, y);
    doc.setFont('helvetica', 'bold').text(reportData.generatedAt, margins.left + 40, y);

    // Section title
    y += 18;
    doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(75, 63, 114);
    doc.text('Client Energetic Insight', margins.left, y);

    // Process content blocks
    const blocks = ServerReportParser.parseReport(reportData.content);

    // Render content
    doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(33);
    let lineY = y + 12;
    const lineH = 7.2;
    const headingGap = 10;
    const footerPad = 20;

    const newPage = () => {
      doc.addPage();
      lineY = margins.top;
    };

    const ensure = (extra = 0) => {
      if (lineY + extra > pageHeight - footerPad) newPage();
    };

    blocks.forEach(block => {
      switch (block.type) {
        case 'heading':
          lineY += headingGap;
          ensure(lineH);
          doc.setFont('helvetica', 'bold').setTextColor(40, 40, 60);
          doc.text(block.text, margins.left, lineY);
          doc.setFont('helvetica', 'normal').setTextColor(33);
          lineY += lineH;
          break;

        case 'action':
          const aWrap = doc.splitTextToSize(block.text, pageWidth - margins.left - margins.right - 5);
          aWrap.forEach(l => {
            ensure(lineH);
            doc.text(l, margins.left + 5, lineY);
            lineY += lineH;
          });
          lineY += 2;
          break;

        case 'tag':
          ensure(lineH);
          doc.setTextColor(60).text(block.text, margins.left + 5, lineY);
          doc.setTextColor(33);
          lineY += lineH;
          break;

        case 'spacer':
          lineY += lineH;
          break;

        default: // normal paragraph
          const pWrap = doc.splitTextToSize(block.text, pageWidth - margins.left - margins.right);
          pWrap.forEach(l => {
            ensure(lineH);
            doc.text(l, margins.left, lineY);
            lineY += lineH;
          });
          lineY += 2;
      }
    });

    // Footer
    if (lineY + 15 < pageHeight) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(120);
      doc.text('www.theraiastro.com', pageWidth / 2, pageHeight - 15, { align: 'center' });
    }

    // Return PDF as base64 string
    return doc.output('datauristring').split(',')[1];
  }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function processGuestReportPdf(guestReportId: string, requestId: string) {
  const logPrefix = `[process-guest-report-pdf][${requestId}]`;
  
  try {
    console.log(`${logPrefix} Processing guest report PDF for ID: ${guestReportId}`);

    // Step 1: Fetch guest report data
    const { data: guestReport, error: fetchError } = await supabase
      .from('guest_reports')
      .select('id, email, report_type, report_content, created_at, email_sent')
      .eq('id', guestReportId)
      .single();

    if (fetchError || !guestReport) {
      throw new Error(`Failed to fetch guest report: ${fetchError?.message || 'Not found'}`);
    }

    if (!guestReport.report_content) {
      throw new Error('Report content is empty');
    }

    if (guestReport.email_sent) {
      console.log(`${logPrefix} Email already sent for this report, skipping`);
      return { success: true, message: 'Email already sent' };
    }

    console.log(`${logPrefix} Found report for ${guestReport.email}, type: ${guestReport.report_type}`);

    // Step 2: Generate PDF
    const reportData = {
      id: guestReport.id,
      content: guestReport.report_content,
      generatedAt: new Date(guestReport.created_at).toLocaleDateString()
    };

    console.log(`${logPrefix} Generating PDF...`);
    const pdfBase64 = ServerPdfGenerator.generateReportPdf(reportData);
    console.log(`${logPrefix} PDF generated successfully, size: ${pdfBase64.length} characters`);

    // Step 3: Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_notification_templates')
      .select('subject, body_html, body_text')
      .eq('template_type', 'report_delivery')
      .single();

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message || 'Template not found'}`);
    }

    console.log(`${logPrefix} Email template fetched: ${template.subject}`);

    // Step 4: Send email with PDF attachment
    const filename = `energetic-report-${guestReport.report_type}-${guestReport.id.substring(0, 8)}.pdf`;
    
    const emailPayload = {
      to: guestReport.email,
      subject: template.subject,
      html: template.body_html,
      text: template.body_text || "",
      from: "Theria Astro <no-reply@theraiastro.com>",
      attachments: [{
        filename: filename,
        content: pdfBase64,
        mimetype: "application/pdf"
      }]
    };

    console.log(`${logPrefix} Sending email to ${guestReport.email}...`);
    
    const emailResponse = await fetch(SMTP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email sending failed: ${emailResponse.status} - ${errorText}`);
    }

    console.log(`${logPrefix} Email sent successfully`);

    // Step 5: Update database
    const { error: updateError } = await supabase
      .from('guest_reports')
      .update({ email_sent: true })
      .eq('id', guestReportId);

    if (updateError) {
      console.error(`${logPrefix} Failed to update email_sent flag: ${updateError.message}`);
      // Don't throw here as email was sent successfully
    }

    console.log(`${logPrefix} Process completed successfully`);
    return { 
      success: true, 
      message: 'PDF generated and emailed successfully',
      filename: filename
    };

  } catch (error) {
    console.error(`${logPrefix} Error processing guest report PDF:`, error);
    throw error;
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const logPrefix = `[process-guest-report-pdf][${requestId}]`;

  console.log(`${logPrefix} Received ${req.method} request`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { guest_report_id } = await req.json();

    if (!guest_report_id) {
      return new Response(
        JSON.stringify({ error: "guest_report_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await processGuestReportPdf(guest_report_id, requestId);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`${logPrefix} Request failed:`, errorMessage);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        requestId 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

console.log("[process-guest-report-pdf] Function initialized and ready");
