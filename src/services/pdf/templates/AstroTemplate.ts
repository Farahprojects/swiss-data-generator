import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';
import { isSynastryData, parseSynastryRich } from '@/lib/synastryFormatter';
import { parseSwissDataRich } from '@/utils/swissFormatter';

export interface AstroPdfData {
  id: string;
  title: string;
  customerName: string;
  swissData: any;
  mappedData?: {
    people: {
      A: { name: string; birthDate?: string; location?: string };
      B?: { name: string; birthDate?: string; location?: string };
    };
    isRelationship: boolean;
    title: string;
  };
  metadata: {
    generatedAt: string;
    reportType?: string;
  };
}

export class AstroTemplate extends BaseTemplate {
  async generate(data: AstroPdfData, options: PdfGenerationOptions = {}): Promise<void> {
    const metadata: PdfMetadata = {
      title: 'Astro Data Report',
      subject: 'Astronomical Data',
      author: 'Therai Astro',
      keywords: ['astrology', 'astronomical data', 'chart']
    };
    this.setMetadata(metadata);

    // Header - Using a serif font closest to GT Sectra
    const logoY = 20;
    this.doc.setFontSize(26).setFont('times', 'normal').setTextColor(40, 40, 60);
    this.doc.text('Therai.', this.pageWidth / 2, logoY + 12, { align: 'center' });

    this.doc.setFontSize(20).setFont('helvetica', 'bold');
    this.doc.text('Astro Data Report', this.pageWidth / 2, logoY + 28, { align: 'center' });

    // Customer name
    this.doc.setFontSize(14).setFont('helvetica', 'normal');
    this.doc.text(`Generated for: ${data.customerName}`, this.pageWidth / 2, logoY + 40, { align: 'center' });

    let y = logoY + 55;

    if (isSynastryData(data.swissData)) {
      y = this.renderSynastryData(data.swissData, y, undefined, data.mappedData);
    } else {
      y = this.renderEssenceData(data.swissData, y, undefined, data.mappedData);
    }

    // Footer
    if (options.includeFooter !== false) {
      this.doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(120);
      this.doc.text('www.theraiastro.com', this.pageWidth / 2, this.pageHeight - 15, { align: 'center' });
    }

    // Save
    const fname = `astro-data-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(fname);
  }

  public renderSynastryData(swissData: any, startY: number, targetDoc?: any, mappedData?: any): number {
    const data = parseSynastryRich(swissData);
    const doc = targetDoc || this.doc;
    let y = startY;

    // Header - Use mapped data names if available
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    const personADisplay = mappedData?.people?.A?.name || data.personA.name || "Person A";
    const personBDisplay = mappedData?.people?.B?.name || data.personB.name || "Person B";
    doc.text(`${personADisplay} & ${personBDisplay} - Compatibility Astro Data`, this.margins.left, y);
    y += 20;

    // Date and time
    doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(data.meta.dateISO).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${data.meta.time}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    doc.text(`${formattedDate} — ${formattedTime}`, this.margins.left, y);
    y += 15;

    if (data.meta.tz) {
      doc.text(data.meta.tz, this.margins.left, y);
      y += 15;
    }

    // Person A
    y = this.renderPersonSection(data.personA, personADisplay, y, targetDoc);
    
    // Divider
    y += 10;
    doc.setDrawColor(200);
    const pageWidth = targetDoc ? targetDoc.internal.pageSize.getWidth() : this.pageWidth;
    doc.line(this.margins.left, y, pageWidth - this.margins.right, y);
    y += 15;

    // Person B  
    y = this.renderPersonSection(data.personB, personBDisplay, y, targetDoc);

    // Composite Chart
    y += 15;
    y = this.renderSection("COMPOSITE CHART - MIDPOINTS", data.composite, y, true, targetDoc);

    // Synastry Aspects
    y += 15;
    y = this.renderSection(`SYNASTRY ASPECTS (${personADisplay} ↔ ${personBDisplay})`, data.synastry, y, false, targetDoc);

    return y;
  }

  public renderEssenceData(swissData: any, startY: number, targetDoc?: any, mappedData?: any): number {
    const data = parseSwissDataRich(swissData);
    const doc = targetDoc || this.doc;
    let y = startY;

    // Header - Use mapped data name if available
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    const personName = mappedData?.people?.A?.name || data.name;
    const headerText = personName ? `${personName} - Astro Data` : 'Your Astro Data';
    doc.text(headerText, this.margins.left, y);
    y += 20;

    if (personName) {
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(60);
      doc.text(personName, this.margins.left, y);
      y += 15;
    }

    // Date and time
    doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(data.dateISO).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${data.timeISO}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    doc.text(`${formattedDate} — ${formattedTime} (${data.tz})`, this.margins.left, y);
    y += 15;

    if (data.meta?.location) {
      doc.text(`${data.meta.location}`, this.margins.left, y);
      if (data.meta.lat && data.meta.lon) {
        doc.text(` (${data.meta.lat.toFixed(2)}°, ${data.meta.lon.toFixed(2)}°)`, this.margins.left + 100, y);
      }
      y += 15;
    }

    // Planetary Positions
    y += 10;
    y = this.renderSection("CURRENT PLANETARY POSITIONS", data.planets, y, true, targetDoc);

    // Aspects
    y += 15;
    y = this.renderSection("ASPECTS TO NATAL", data.aspects, y, false, targetDoc);

    return y;
  }

  private renderPersonSection(person: any, displayName: string, startY: number, targetDoc?: any): number {
    let y = startY;
    
    y = this.renderSection(`${displayName} - CURRENT POSITIONS`, person.planets, y, true, targetDoc);
    y += 10;
    y = this.renderSection(`${displayName} - ASPECTS TO NATAL`, person.aspectsToNatal, y, false, targetDoc);
    
    return y;
  }

  private renderSection(title: string, data: any[], startY: number, isPlanetTable: boolean, targetDoc?: any): number {
    const doc = targetDoc || this.doc;
    const pageHeight = targetDoc ? targetDoc.internal.pageSize.getHeight() : this.pageHeight;
    let y = startY;
    
    // Section title
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text(title, this.margins.left, y);
    y += 12;

    if (data.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text(isPlanetTable ? 'No planetary data available.' : 'No significant aspects detected.', this.margins.left, y);
      return y + 10;
    }

    // Table headers
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    if (isPlanetTable) {
      doc.text('Planet', this.margins.left, y);
      doc.text('Position', this.margins.left + 80, y);
    } else {
      doc.text('Planet', this.margins.left, y);
      doc.text('Aspect', this.margins.left + 60, y);
      doc.text('To', this.margins.left + 100, y);
      doc.text('Orb', this.margins.left + 130, y);
    }
    y += 12;

    // Table data
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    data.forEach((item: any) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = this.margins.top;
      }

      if (isPlanetTable) {
        doc.text(item.name, this.margins.left, y);
        const position = `${String(item.deg).padStart(2, "0")}°${String(item.min).padStart(2, "0")}' in ${item.sign}`;
        doc.text(position, this.margins.left + 80, y);
        if (item.retro) {
          doc.setFont('helvetica', 'italic');
          doc.text(' Retrograde', this.margins.left + 150, y);
          doc.setFont('helvetica', 'normal');
        }
      } else {
        doc.text(item.a, this.margins.left, y);
        doc.text(item.type, this.margins.left + 60, y);
        doc.text(item.b, this.margins.left + 100, y);
        doc.text(`${item.orbDeg}°${String(item.orbMin).padStart(2, "0")}'`, this.margins.left + 130, y);
      }
      y += 10;
    });

    return y;
  }
}