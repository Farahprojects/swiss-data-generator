import { BaseTemplate } from './BaseTemplate';
import { PdfGenerationOptions, PdfMetadata } from '../types';
import { isSynastryData, parseAstroData } from '@/lib/astroFormatter';


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

    // Header
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
      // Footer placeholder - no content by default
    }

    // Save
    const fname = `astro-data-${data.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;
    this.download(fname);
  }

  public renderSynastryData(swissData: any, startY: number, targetDoc?: any): number {
    const data = parseAstroData(swissData);
    const doc = targetDoc || this.doc;
    let y = startY;

    const { meta, natal_set, synastry_aspects, composite_chart, transits } = data;

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    const personAName = natal_set?.personA?.name || 'Person A';
    const personBName = natal_set?.personB?.name || 'Person B';
    doc.text(`${personAName} & ${personBName} - Compatibility Astro Data`, this.margins.left, y);
    y += 20;

    // Date and time
    doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(meta.date).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${meta.time}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    doc.text(`${formattedDate} — ${formattedTime}`, this.margins.left, y);
    y += 15;

    if (meta.tz) {
      doc.text(meta.tz, this.margins.left, y);
      y += 15;
    }

    // Person A Natal
    if (natal_set?.personA) {
      y = this.renderPersonSection(natal_set.personA, 'Natal Data', y, targetDoc);
      y += 10;
    }
    
    // Person B Natal
    if (natal_set?.personB) {
      const pageWidth = targetDoc ? targetDoc.internal.pageSize.getWidth() : this.pageWidth;
      doc.setDrawColor(200).line(this.margins.left, y, pageWidth - this.margins.right, y);
      y += 15;
      y = this.renderPersonSection(natal_set.personB, 'Natal Data', y, targetDoc);
    }
    
    // Synastry Aspects
    if (synastry_aspects?.aspects) {
      y += 15;
      y = this.renderSection(`SYNASTRY ASPECTS (${personAName} ↔ ${personBName})`, synastry_aspects.aspects, y, false, targetDoc);
    }

    // Composite Chart
    if (composite_chart) {
      y += 15;
      y = this.renderSection("COMPOSITE CHART - MIDPOINTS", composite_chart, y, true, targetDoc);
    }

    // Transits
    if (transits?.personA?.aspects_to_natal) {
      y+= 15;
      y = this.renderSection(`TRANSITS to ${transits.personA.name}`, transits.personA.aspects_to_natal, y, false, targetDoc);
    }
    if (transits?.personB?.aspects_to_natal) {
      y+= 15;
      y = this.renderSection(`TRANSITS to ${transits.personB.name}`, transits.personB.aspects_to_natal, y, false, targetDoc);
    }

    return y;
  }

  public renderEssenceData(swissData: any, startY: number, targetDoc?: any): number {
    const parsed = parseAstroData(swissData);
    const natal = parsed?.natal;
    const doc = targetDoc || this.doc;
    let y = startY;

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(40, 40, 60);
    doc.text('Your Astro Data', this.margins.left, y);
    y += 20;

    if (natal?.name) {
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(60);
      doc.text(natal.name, this.margins.left, y);
      y += 15;
    }

    // Date and time
    doc.setFontSize(12).setFont('helvetica', 'normal').setTextColor(100);
    const formattedDate = new Date(parsed?.meta?.date || new Date().toISOString()).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric"
    });
    const formattedTime = new Date(`1970-01-01T${parsed?.meta?.time || '00:00'}Z`).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit"
    });
    const tz = parsed?.meta?.tz ? ` (${parsed.meta.tz})` : '';
    doc.text(`${formattedDate} — ${formattedTime}${tz}`, this.margins.left, y);
    y += 15;

    if (parsed?.meta?.location) {
      doc.text(`${parsed.meta.location}`, this.margins.left, y);
      if (parsed.meta.lat && parsed.meta.lon) {
        doc.text(` (${Number(parsed.meta.lat).toFixed(2)}°, ${Number(parsed.meta.lon).toFixed(2)}°)`, this.margins.left + 100, y);
      }
      y += 15;
    }

    if (natal?.angles && natal.angles.length > 0) {
      y += 10;
      // Convert angles array to a map for rendering helper
      const anglesMap: Record<string, any> = {};
      natal.angles.forEach((a: any) => { anglesMap[a.name] = a; });
      y = this.renderAnglesSection(anglesMap as any, y, targetDoc);
    }

    if (natal?.houses && (Array.isArray(natal.houses) ? natal.houses.length > 0 : Object.keys(natal.houses || {}).length > 0)) {
      y += 15;
      const housesMap: Record<string, any> = Array.isArray(natal.houses)
        ? natal.houses.reduce((acc: any, h: any) => { acc[String(h.number ?? '')] = h; return acc; }, {})
        : natal.houses;
      y = this.renderHousesSection(housesMap as any, y, targetDoc);
    }

    y += 10;
    y = this.renderSection("NATAL PLANETARY POSITIONS", natal?.planets || [], y, true, targetDoc);

    y += 15;
    y = this.renderSection("NATAL ASPECTS", natal?.aspects || [], y, false, targetDoc);

    const transitsA = parsed?.transits?.personA;
    if (transitsA?.planets && transitsA.planets.length > 0) {
      y += 15;
      y = this.renderSection("CURRENT TRANSIT POSITIONS", transitsA.planets, y, true, targetDoc);
    }

    if (transitsA?.aspects_to_natal && transitsA.aspects_to_natal.length > 0) {
      y += 15;
      y = this.renderSection("TRANSIT ASPECTS TO NATAL", transitsA.aspects_to_natal, y, false, targetDoc);
    }

    return y;
  }

  private renderPersonSection(person: any, title: string, startY: number, targetDoc?: any): number {
    let y = startY;
    
    // Render Planets
    y = this.renderSection(`${person.name} - Planets`, person.planets, y, true, targetDoc);
    y += 10;
    
    // Render Natal Aspects
    y = this.renderSection(`${person.name} - ${title}`, person.aspects, y, false, targetDoc);
    
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

    if (!data || data.length === 0) {
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
        const sign = (item.sign || '').padEnd(12);
        const deg = String(Math.floor(item.deg || 0)).padStart(2, '0');
        const min = String(Math.round((item.deg - Math.floor(item.deg)) * 60)).padStart(2, '0');
        const house = item.house ? `(H${item.house})` : '';
        const position = `${deg}° ${sign} ${min}' ${house}`;

        doc.text(item.name || 'Unknown', this.margins.left, y);
        doc.text(position, this.margins.left + 80, y);
        
        if (item.retrograde) {
          doc.setFont('helvetica', 'italic');
          doc.text('R', this.margins.left + 170, y);
          doc.setFont('helvetica', 'normal');
        }
      } else {
        doc.text(item.a || 'Unknown', this.margins.left, y);
        doc.text(item.type || 'Unknown', this.margins.left + 60, y);
        doc.text(item.b || 'Unknown', this.margins.left + 100, y);
        doc.text(`${item.orb?.toFixed(2) ?? '0.00'}°`, this.margins.left + 130, y);
      }
      y += 10;
    });

    return y;
  }

  private renderAnglesSection(angles: any[], startY: number, targetDoc?: any): number {
    const doc = targetDoc || this.doc;
    let y = startY;
    
    // Section title
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('CHART ANGLES', this.margins.left, y);
    y += 12;

    if (!angles || angles.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text('No angle data available.', this.margins.left, y);
      return y + 10;
    }

    // Headers
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('Angle', this.margins.left, y);
    doc.text('Position', this.margins.left + 80, y);
    y += 12;

    // Data
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    Object.entries(angles).forEach(([name, data]: [string, any]) => {
      const position = `${Math.floor(data.deg)}° in ${data.sign}`;
      doc.text(name, this.margins.left, y);
      doc.text(position, this.margins.left + 80, y);
      y += 10;
    });

    return y;
  }

  private renderHousesSection(houses: any[], startY: number, targetDoc?: any): number {
    const doc = targetDoc || this.doc;
    const pageHeight = targetDoc ? targetDoc.internal.pageSize.getHeight() : this.pageHeight;
    let y = startY;
    
    // Section title
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('HOUSE CUSPS', this.margins.left, y);
    y += 12;

    if (!houses || houses.length === 0) {
      doc.setFontSize(9).setFont('helvetica', 'italic').setTextColor(150);
      doc.text('No house data available.', this.margins.left, y);
      return y + 10;
    }

    // Headers
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(120);
    doc.text('House', this.margins.left, y);
    doc.text('Cusp Position', this.margins.left + 80, y);
    y += 12;

    // Data
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(40);
    Object.entries(houses).forEach(([number, data]: [string, any]) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = this.margins.top;
      }
      
      doc.text(`House ${number}`, this.margins.left, y);
      const position = `${Math.floor(data.deg)}° in ${data.sign}`;
      doc.text(position, this.margins.left + 80, y);
      y += 10;
    });

    return y;
  }
}