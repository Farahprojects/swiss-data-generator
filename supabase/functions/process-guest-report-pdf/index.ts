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
  static generateReportPdf(reportData: any, logPrefix: string): string {
    console.log(`${logPrefix} Starting PDF generation with jsPDF...`);
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      console.log(`${logPrefix} jsPDF instance created successfully`);

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

      console.log(`${logPrefix} PDF metadata set`);

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

      console.log(`${logPrefix} PDF header and meta information added`);

      // Process content blocks
      const blocks = ServerReportParser.parseReport(reportData.content);
      console.log(`${logPrefix} Content parsed into ${blocks.length} blocks`);

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

      blocks.forEach((block, index) => {
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

      console.log(`${logPrefix} Content rendered to PDF, processed ${blocks.length} blocks`);

      // Footer
      if (lineY + 15 < pageHeight) {
        doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(120);
        doc.text('www.theraiastro.com', pageWidth / 2, pageHeight - 15, { align: 'center' });
      }

      console.log(`${logPrefix} PDF footer added`);

      // Generate PDF output and analyze it
      console.log(`${logPrefix} Generating PDF output...`);
      
      // Try different output methods to see what works
      let pdfOutput;
      try {
        pdfOutput = doc.output('datauristring');
        console.log(`${logPrefix} PDF output generated using 'datauristring' method`);
        console.log(`${logPrefix} Full output length: ${pdfOutput.length}`);
        console.log(`${logPrefix} Output starts with: ${pdfOutput.substring(0, 100)}`);
        
        // Check if it's a valid data URI
        if (pdfOutput.startsWith('data:application/pdf;base64,')) {
          const base64Part = pdfOutput.split(',')[1];
          console.log(`${logPrefix} Base64 part length: ${base64Part.length}`);
          console.log(`${logPrefix} Base64 starts with: ${base64Part.substring(0, 50)}`);
          console.log(`${logPrefix} Base64 ends with: ${base64Part.substring(base64Part.length - 50)}`);
          
          // Validate base64
          try {
            // Try to decode to verify it's valid base64
            const decoded = atob(base64Part);
            console.log(`${logPrefix} Base64 decode successful, decoded length: ${decoded.length}`);
            console.log(`${logPrefix} Decoded starts with: ${decoded.substring(0, 20).split('').map(c => c.charCodeAt(0)).join(',')}`);
            
            // Check for PDF signature
            if (decoded.startsWith('%PDF-')) {
              console.log(`${logPrefix} ✅ Valid PDF signature found in decoded content`);
            } else {
              console.log(`${logPrefix} ❌ No PDF signature found. First 10 chars: ${decoded.substring(0, 10)}`);
            }
            
            return base64Part;
          } catch (decodeError) {
            console.error(`${logPrefix} ❌ Base64 decode failed:`, decodeError);
          }
        } else {
          console.log(`${logPrefix} ❌ Output doesn't start with data URI prefix`);
        }
      } catch (outputError) {
        console.error(`${logPrefix} ❌ Error generating PDF output:`, outputError);
      }

      // Try alternative output method
      try {
        console.log(`${logPrefix} Trying alternative output method: 'datauri'`);
        const altOutput = doc.output('datauri');
        console.log(`${logPrefix} Alternative output length: ${altOutput.length}`);
        console.log(`${logPrefix} Alternative output starts with: ${altOutput.substring(0, 100)}`);
      } catch (altError) {
        console.error(`${logPrefix} Alternative method failed:`, altError);
      }

      // Try base64 string directly
      try {
        console.log(`${logPrefix} Trying direct base64 output`);
        const base64Output = doc.output('dataurl');
        console.log(`${logPrefix} Direct base64 output length: ${base64Output.length}`);
        console.log(`${logPrefix} Direct base64 output starts with: ${base64Output.substring(0, 100)}`);
      } catch (base64Error) {
        console.error(`${logPrefix} Direct base64 method failed:`, base64Error);
      }

      // Fallback: return empty base64 with clear error
      console.error(`${logPrefix} ❌ All PDF generation methods failed`);
      return "";

    } catch (error) {
      console.error(`${logPrefix} ❌ Fatal error in PDF generation:`, error);
      console.error(`${logPrefix} Error stack:`, error.stack);
      return "";
    }
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
    console.log(`${logPrefix} Report content length: ${guestReport.report_content.length} characters`);

    // Step 2: Generate PDF
    const reportData = {
      id: guestReport.id,
      content: guestReport.report_content,
      generatedAt: new Date(guestReport.created_at).toLocaleDateString()
    };

    console.log(`${logPrefix} Generating PDF...`);
    const pdfBase64 = ServerPdfGenerator.generateReportPdf(reportData, logPrefix);
    
    if (!pdfBase64) {
      throw new Error('PDF generation failed - no content generated');
    }
    
    console.log(`${logPrefix} PDF generated successfully, base64 length: ${pdfBase64.length} characters`);
    console.log(`${logPrefix} PDF base64 starts with: ${pdfBase64.substring(0, 50)}`);
    console.log(`${logPrefix} PDF base64 ends with: ${pdfBase64.substring(pdfBase64.length - 50)}`);

    // Validate the base64 content
    try {
      const decoded = atob(pdfBase64);
      console.log(`${logPrefix} Base64 validation: decoded ${decoded.length} bytes`);
      if (decoded.startsWith('%PDF-')) {
        console.log(`${logPrefix} ✅ PDF signature validation passed`);
      } else {
        console.log(`${logPrefix} ❌ PDF signature validation failed - not a valid PDF`);
        throw new Error('Generated content is not a valid PDF');
      }
    } catch (validationError) {
      console.error(`${logPrefix} Base64 validation failed:`, validationError);
      throw new Error('Generated PDF content is not valid base64');
    }

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

    console.log(`${logPrefix} Email payload prepared:`);
    console.log(`${logPrefix} - To: ${emailPayload.to}`);
    console.log(`${logPrefix} - Subject: ${emailPayload.subject}`);
    console.log(`${logPrefix} - Attachment: ${filename} (${pdfBase64.length} chars)`);
    console.log(`${logPrefix} - Attachment starts: ${pdfBase64.substring(0, 30)}...`);

    console.log(`${logPrefix} Sending email to ${guestReport.email}...`);
    
    const emailResponse = await fetch(SMTP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    const emailResponseText = await emailResponse.text();
    console.log(`${logPrefix} Email response status: ${emailResponse.status}`);
    console.log(`${logPrefix} Email response body: ${emailResponseText}`);

    if (!emailResponse.ok) {
      throw new Error(`Email sending failed: ${emailResponse.status} - ${emailResponseText}`);
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
      filename: filename,
      pdfSize: pdfBase64.length
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
