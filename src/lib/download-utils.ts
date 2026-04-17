import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export const downloadPDF = (title: string, headers: string[][], data: any[][], filename: string, settings?: any) => {
  try {
    const doc = new jsPDF();
    const accentColor = settings?.accentColor || '#4f46e5';
    
    // Header line with accent color
    doc.setDrawColor(accentColor);
    doc.setLineWidth(2);
    doc.line(14, 15, 60, 15);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(title, 14, 30);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Document généré par VI Compt PRO • ${new Date().toLocaleString()}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: headers,
      body: data,
      headStyles: { 
        fillColor: accentColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: 51
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 45 }
    });

    // Add footer if present
    if (settings?.footerText) {
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        const splitFooter = doc.splitTextToSize(settings.footerText, 180);
        doc.text(splitFooter, 105, 285, { align: 'center' });
        doc.text(`Page ${i} sur ${pageCount}`, 190, 285, { align: 'right' });
      }
    }

    doc.save(`${filename}.pdf`);
    toast.success(`Fichier ${filename}.pdf téléchargé avec succès`);
  } catch (error) {
    console.error('Erreur PDF:', error);
    toast.error('Erreur lors de la génération du PDF');
  }
};

export const downloadCSV = (data: any[], filename: string) => {
  try {
    if (data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(fieldName => JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)).join(',')
      )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Fichier ${filename}.csv téléchargé avec succès`);
  } catch (error) {
    console.error('Erreur CSV:', error);
    toast.error('Erreur lors de la génération du CSV');
  }
};
