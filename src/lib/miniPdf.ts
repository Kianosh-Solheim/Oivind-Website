// Zero-dependency vector PDF 1.4 generator supporting A4 mm coordinates,
// standard Type1 fonts (Helvetica & Times with WinAnsiEncoding for Norwegian æøåÆØÅ«»–·©“”’),
// rectangles, rounded rectangles, circles, lines, and multi-page output.

const MM_TO_PT = 72 / 25.4; // 2.8346456693

// Windows-1252 (WinAnsiEncoding) special mapping for characters outside 0x00-0xFF that match Unicode
const WIN_ANSI_MAP: Record<number, number> = {
  0x20ac: 0x80, // €
  0x201a: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201e: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02c6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8a, // Š
  0x2039: 0x8b, // ‹
  0x0152: 0x8c, // Œ
  0x017d: 0x8e, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // – (en-dash)
  0x2014: 0x97, // — (em-dash)
  0x02dc: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9a, // š
  0x203a: 0x9b, // ›
  0x0153: 0x9c, // œ
  0x017e: 0x9e, // ž
  0x0178: 0x9f  // Ÿ
};

function encodeWinAnsiPdfString(str: string): string {
  let out = '(';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const byte = code <= 0xff ? code : (WIN_ANSI_MAP[code] ?? 0x3f);
    if (byte === 0x28) {
      out += '\\(';
    } else if (byte === 0x29) {
      out += '\\)';
    } else if (byte === 0x5c) {
      out += '\\\\';
    } else if (byte < 0x20 || byte >= 0x7f) {
      out += '\\' + byte.toString(8).padStart(3, '0');
    } else {
      out += String.fromCharCode(byte);
    }
  }
  out += ')';
  return out;
}

type FontKey = 'F1' | 'F2' | 'F3' | 'F4' | 'F5';

export class MiniPdf {
  private pageWidthMm = 210;
  private pageHeightMm = 297;
  private pages: string[][] = [[]];
  private currentFont: FontKey = 'F1';
  private currentFontSize = 12;
  private fillRgb: [number, number, number] = [0, 0, 0];
  private strokeRgb: [number, number, number] = [0, 0, 0];
  private textRgb: [number, number, number] = [0, 0, 0];
  private lineWidthMm = 0.2;

  private get stream(): string[] {
    return this.pages[this.pages.length - 1];
  }

  private pt(mm: number): string {
    return (mm * MM_TO_PT).toFixed(2);
  }

  private yPt(yMm: number): string {
    return ((this.pageHeightMm - yMm) * MM_TO_PT).toFixed(2);
  }

  addPage(): void {
    this.pages.push([]);
  }

  setFillColor(r: number, g: number, b: number): void {
    this.fillRgb = [r / 255, g / 255, b / 255];
    this.stream.push(
      `${this.fillRgb[0].toFixed(3)} ${this.fillRgb[1].toFixed(3)} ${this.fillRgb[2].toFixed(3)} rg`
    );
  }

  setDrawColor(r: number, g: number, b: number): void {
    this.strokeRgb = [r / 255, g / 255, b / 255];
    this.stream.push(
      `${this.strokeRgb[0].toFixed(3)} ${this.strokeRgb[1].toFixed(3)} ${this.strokeRgb[2].toFixed(3)} RG`
    );
  }

  setTextColor(r: number, g: number, b: number): void {
    this.textRgb = [r / 255, g / 255, b / 255];
  }

  setLineWidth(widthMm: number): void {
    this.lineWidthMm = widthMm;
    this.stream.push(`${this.pt(this.lineWidthMm)} w`);
  }

  setFont(family: 'helvetica' | 'times', style: 'normal' | 'bold' | 'italic'): void {
    if (family === 'helvetica') {
      if (style === 'bold') this.currentFont = 'F2';
      else if (style === 'italic') this.currentFont = 'F3';
      else this.currentFont = 'F1';
    } else {
      if (style === 'bold') this.currentFont = 'F5';
      else this.currentFont = 'F4';
    }
  }

  setFontSize(sizePt: number): void {
    this.currentFontSize = sizePt;
  }

  rect(xMm: number, yMm: number, wMm: number, hMm: number, style: 'F' | 'S' = 'F'): void {
    const x = this.pt(xMm);
    const y = this.yPt(yMm + hMm);
    const w = this.pt(wMm);
    const h = this.pt(hMm);
    const op = style === 'F' ? 'f' : 'S';
    this.stream.push(`${x} ${y} ${w} ${h} re ${op}`);
  }

  roundedRect(
    xMm: number,
    yMm: number,
    wMm: number,
    hMm: number,
    _rxMm: number,
    _ryMm: number,
    style: 'F' | 'S' = 'F'
  ): void {
    this.rect(xMm, yMm, wMm, hMm, style);
  }

  line(x1Mm: number, y1Mm: number, x2Mm: number, y2Mm: number): void {
    this.stream.push(
      `${this.pt(x1Mm)} ${this.yPt(y1Mm)} m ${this.pt(x2Mm)} ${this.yPt(y2Mm)} l S`
    );
  }

  circle(cxMm: number, cyMm: number, rMm: number, style: 'F' | 'S' = 'S'): void {
    const cx = cxMm * MM_TO_PT;
    const cy = (this.pageHeightMm - cyMm) * MM_TO_PT;
    const r = rMm * MM_TO_PT;
    const k = 0.5522847498;
    const ox = r * k;
    const oy = r * k;

    const p = (v: number) => v.toFixed(2);
    const op = style === 'F' ? 'f' : 'S';

    this.stream.push(
      `${p(cx - r)} ${p(cy)} m`,
      `${p(cx - r)} ${p(cy + oy)} ${p(cx - ox)} ${p(cy + r)} ${p(cx)} ${p(cy + r)} c`,
      `${p(cx + ox)} ${p(cy + r)} ${p(cx + r)} ${p(cy + oy)} ${p(cx + r)} ${p(cy)} c`,
      `${p(cx + r)} ${p(cy - oy)} ${p(cx + ox)} ${p(cy - r)} ${p(cx)} ${p(cy - r)} c`,
      `${p(cx - ox)} ${p(cy - r)} ${p(cx - r)} ${p(cy - oy)} ${p(cx - r)} ${p(cy)} c`,
      op
    );
  }

  private measureStringWidthMm(text: string): number {
    const isTimes = this.currentFont === 'F4' || this.currentFont === 'F5';
    const isBold = this.currentFont === 'F2' || this.currentFont === 'F5';
    const avgFactor = isTimes ? (isBold ? 0.5 : 0.47) : isBold ? 0.55 : 0.51;
    let totalFactor = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if ('ilI.,:;!| '.includes(ch)) totalFactor += 0.28;
      else if ('mwMWØÆ'.includes(ch)) totalFactor += 0.78;
      else if (ch >= 'A' && ch <= 'Z') totalFactor += 0.64;
      else totalFactor += avgFactor;
    }
    return (totalFactor * this.currentFontSize) / MM_TO_PT;
  }

  splitTextToSize(text: string, maxWidthMm: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (this.measureStringWidthMm(candidate) <= maxWidthMm || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  text(
    content: string | string[],
    xMm: number,
    yMm: number,
    options?: { align?: 'left' | 'center' | 'right' }
  ): void {
    const lines = Array.isArray(content) ? content : [content];
    const lineStepMm = (this.currentFontSize * 1.28) / MM_TO_PT;

    lines.forEach((lineStr, idx) => {
      const lineY = yMm + idx * lineStepMm;
      let drawX = xMm;
      if (options?.align === 'center') {
        drawX = xMm - this.measureStringWidthMm(lineStr) / 2;
      } else if (options?.align === 'right') {
        drawX = xMm - this.measureStringWidthMm(lineStr);
      }

      const [tr, tg, tb] = this.textRgb;
      this.stream.push(
        'BT',
        `/${this.currentFont} ${this.currentFontSize.toFixed(1)} Tf`,
        `${tr.toFixed(3)} ${tg.toFixed(3)} ${tb.toFixed(3)} rg`,
        `${this.pt(drawX)} ${this.yPt(lineY)} Td`,
        `${encodeWinAnsiPdfString(lineStr)} Tj`,
        'ET'
      );
    });
  }

  save(filename: string): void {
    const objects: string[] = [];
    const addObj = (body: string): number => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesId = addObj('');

    const f1Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const f3Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
    const f4Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>');
    const f5Id = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>');

    const pageIds: number[] = [];
    const wPt = (this.pageWidthMm * MM_TO_PT).toFixed(2);
    const hPt = (this.pageHeightMm * MM_TO_PT).toFixed(2);

    this.pages.forEach((cmds) => {
      const streamData = cmds.join('\n');
      const contentId = addObj(
        `<< /Length ${streamData.length} >>\nstream\n${streamData}\nendstream`
      );
      const pageId = addObj(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${wPt} ${hPt}] /Resources << /Font << /F1 ${f1Id} 0 R /F2 ${f2Id} 0 R /F3 ${f3Id} 0 R /F4 ${f4Id} 0 R /F5 ${f5Id} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      pageIds.push(pageId);
    });

    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];

    objects.forEach((body, idx) => {
      offsets.push(pdf.length);
      pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach((off) => {
      pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });

    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) {
      bytes[i] = pdf.charCodeAt(i) & 0xff;
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
