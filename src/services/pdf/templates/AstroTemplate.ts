import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';
import { isSynastryData, parseSynastryRich } from '@/lib/synastryFormatter';
import { parseSwissDataRich } from '@/utils/swissFormatter';

export interface AstroPdfData {
  id: string;
  title: string;
  customerName: string;
  swissData: any;
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
      y = this.renderSynastryData(data.swissData, y);
    } else {
      y = this.renderEssenceData(data.swissData, y);
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

  private renderSynastryData(swissData: any, startY: number): number {
    const data = parseSynastryRich(swissData);
    let y = startY;

    // Header
    this.doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    const personADisplay = data.personA.name || "Person A";
    const personBDisplay = data.personB.name || "Person B";
    this.doc.text(`${personADisplay} & ${personBDisplay} - Compatibility Astro Data`, this.margins.left, y);
    y += 20;

    // Date and time
    this.doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(data.meta.dateISO).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${data.meta.time}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    this.doc.text(`${formattedDate} — ${formattedTime}`, this.margins.left, y);
    y += 15;

    if (data.meta.tz) {
      this.doc.text(data.meta.tz, this.margins.left, y);
      y += 15;
    }

    // Person A
    y = this.renderPersonSection(data.personA, personADisplay, y);
    
    // Divider
    y += 10;
    this.doc.setDrawColor(200);
    this.doc.line(this.margins.left, y, this.pageWidth - this.margins.right, y);
    y += 15;

    // Person B  
    y = this.renderPersonSection(data.personB, personBDisplay, y);

    // Composite Chart
    y += 15;
    y = this.renderSection("COMPOSITE CHART - MIDPOINTS", data.composite, y, true);

    // Synastry Aspects
    y += 15;
    y = this.renderSection(`SYNASTRY ASPECTS (${personADisplay} ↔ ${personBDisplay})`, data.synastry, y, false);

    return y;
  }

  private renderEssenceData(swissData: any, startY: number): number {
    const data = parseSwissDataRich(swissData);
    let y = startY;

    // Header
    this.doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    this.doc.text('Your Astro Data', this.margins.left, y);
    y += 20;

    if (data.name) {
      this.doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(60);
      this.doc.text(data.name, this.margins.left, y);
      y += 15;
    }

    // Date and time
    this.doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(data.dateISO).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${data.timeISO}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    this.doc.text(`${formattedDate} — ${formattedTime} (${data.tz})`, this.margins.left, y);
    y += 15;

    if (data.meta?.location) {
      this.doc.text(`${data.meta.location}`, this.margins.left, y);
      if (data.meta.lat && data.meta.lon) {
        this.doc.text(` (${data.meta.lat.toFixed(2)}°, ${data.meta.lon.toFixed(2)}°)`, this.margins.left + 100, y);
      }
      y += 15;
    }

    // Planetary Positions
    y += 10;
    y = this.renderSection("CURRENT PLANETARY POSITIONS", data.planets, y, true);

    // Aspects
    y += 15;
    y = this.renderSection("ASPECTS TO NATAL", data.aspects, y, false);

    return y;
  }

  private renderPersonSection(person: any, displayName: string, startY: number): number {
    let y = startY;
    
    y = this.renderSection(`${displayName} - CURRENT POSITIONS`, person.planets, y, true);
    y += 10;
    y = this.renderSection(`${displayName} - ASPECTS TO NATAL`, person.aspectsToNatal, y, false);
    
    return y;
  }

  private renderSection(title: string, data: any[], startY: number, isPlanetTable: boolean): number {
    let y = startY;
    
    // Section title
    this.doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    this.doc.text(title, this.margins.left, y);
    y += 12;

    if (data.length === 0) {
      this.doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      this.doc.text(isPlanetTable ? 'No planetary data available.' : 'No significant aspects detected.', this.margins.left, y);
      return y + 10;
    }

    // Table headers
    this.doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    if (isPlanetTable) {
      this.doc.text('Planet', this.margins.left, y);
      this.doc.text('Position', this.margins.left + 80, y);
    } else {
      this.doc.text('Planet', this.margins.left, y);
      this.doc.text('Aspect', this.margins.left + 60, y);
      this.doc.text('To', this.margins.left + 100, y);
      this.doc.text('Orb', this.margins.left + 130, y);
    }
    y += 12;

    // Table data
    this.doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    data.forEach((item: any) => {
      if (y > this.pageHeight - 40) {
        this.doc.addPage();
        y = this.margins.top;
      }

      if (isPlanetTable) {
        this.doc.text(item.name, this.margins.left, y);
        const position = `${String(item.deg).padStart(2, "0")}°${String(item.min).padStart(2, "0")}' in ${item.sign}`;
        this.doc.text(position, this.margins.left + 80, y);
        if (item.retro) {
          this.doc.setFont('helvetica', 'italic');
          this.doc.text(' Retrograde', this.margins.left + 150, y);
          this.doc.setFont('helvetica', 'normal');
        }
      } else {
        this.doc.text(item.a, this.margins.left, y);
        this.doc.text(item.type, this.margins.left + 60, y);
        this.doc.text(item.b, this.margins.left + 100, y);
        this.doc.text(`${item.orbDeg}°${String(item.orbMin).padStart(2, "0")}'`, this.margins.left + 130, y);
      }
      y += 10;
    });

    return y;
  }
}