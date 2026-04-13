import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

export const downloadPDF = (title: string, headers: string[][], data: any[][], filename: string) => {
  try {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString()}`, 14, 30);

    (doc as any).autoTable({
      startY: 35,
      head: headers,
      body: data,
    });

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
