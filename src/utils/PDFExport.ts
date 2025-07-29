import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  includeTimestamp?: boolean;
  quality?: number;
}

export class PDFExport {
  private static defaultOptions: PDFExportOptions = {
    filename: 'export',
    includeTimestamp: true,
    quality: 1.0
  };

  /**
   * Export a single element (chart or table) to PDF
   */
  static async exportElementToPDF(
    element: HTMLElement, 
    options: PDFExportOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: opts.quality,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions
      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Generate filename
      const filename = this.generateFilename(opts.filename!, opts.includeTimestamp!);
      
      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }

  /**
   * Export multiple elements to a single PDF
   */
  static async exportMultipleElementsToPDF(
    elements: { element: HTMLElement; title?: string }[],
    options: PDFExportOptions = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      let isFirstPage = true;

      for (const { element, title } of elements) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        // Add title if provided
        if (title) {
          pdf.setFontSize(16);
          pdf.setTextColor(138, 0, 81); // Theme color
          pdf.text(title, 10, 15);
        }

        // Capture element
        const canvas = await html2canvas(element, {
          scale: opts.quality,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });

        // Calculate dimensions
        const imgWidth = 280; // Leave margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const yPosition = title ? 25 : 10;
        
        // Add image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);

        isFirstPage = false;
      }

      // Generate filename
      const filename = this.generateFilename(opts.filename!, opts.includeTimestamp!);
      
      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Failed to export PDF. Please try again.');
    }
  }

  /**
   * Export data table as formatted PDF
   */
  static async exportDataTableToPDF(
    data: any[],
    columns: string[],
    options: PDFExportOptions & { title?: string } = {}
  ): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Add title
      if (opts.title) {
        pdf.setFontSize(16);
        pdf.setTextColor(138, 0, 81);
        pdf.text(opts.title, 10, 15);
      }

      // Table configuration
      const startY = opts.title ? 25 : 15;
      const pageHeight = 210; // A4 landscape height
      const marginBottom = 20;
      const rowHeight = 8;
      const headerHeight = 10;
      
      let currentY = startY;

      // Draw header
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.setFillColor(138, 0, 81);
      pdf.rect(10, currentY, 280, headerHeight, 'F');
      
      const colWidth = 280 / columns.length;
      columns.forEach((col, index) => {
        pdf.text(col, 12 + (index * colWidth), currentY + 7);
      });
      
      currentY += headerHeight;

      // Draw data rows
      pdf.setTextColor(0, 0, 0);
      data.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (currentY + rowHeight > pageHeight - marginBottom) {
          pdf.addPage();
          currentY = 15;
          
          // Redraw header on new page
          pdf.setTextColor(255, 255, 255);
          pdf.setFillColor(138, 0, 81);
          pdf.rect(10, currentY, 280, headerHeight, 'F');
          
          columns.forEach((col, index) => {
            pdf.text(col, 12 + (index * colWidth), currentY + 7);
          });
          
          currentY += headerHeight;
          pdf.setTextColor(0, 0, 0);
        }

        // Alternate row colors
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(249, 236, 239);
          pdf.rect(10, currentY, 280, rowHeight, 'F');
        }

        // Draw row data
        columns.forEach((col, index) => {
          const value = row[col];
          const text = value !== undefined && value !== null ? String(value) : '-';
          pdf.text(text, 12 + (index * colWidth), currentY + 6);
        });

        currentY += rowHeight;
      });

      // Generate filename
      const filename = this.generateFilename(opts.filename!, opts.includeTimestamp!);
      
      // Save PDF
      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting table to PDF:', error);
      throw new Error('Failed to export table to PDF. Please try again.');
    }
  }

  /**
   * Generate filename with optional timestamp
   */
  private static generateFilename(baseName: string, includeTimestamp: boolean): string {
    if (includeTimestamp) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      return `${baseName}_${timestamp}.pdf`;
    }
    return `${baseName}.pdf`;
  }

  /**
   * Wait for element to be ready for capture
   */
  static async waitForElement(element: HTMLElement, timeout = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        if (element.offsetWidth > 0 && element.offsetHeight > 0) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Element not ready for capture'));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  }
}