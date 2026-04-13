import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Printer, Download, Search, Filter, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function Drafts() {
  const { userData, company } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;
    // In this app, "entries" seems to be the collection for transactions
    const q = query(
      collection(db, `companies/${userData.companyId}/transactions`),
      orderBy('date', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [userData]);

  const filteredEntries = entries.filter(e => {
    const searchStr = `${e.description} ${e.reference} ${e.journalId}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    doc.text("Brouillard Comptable", 14, 15);
    
    const tableData = filteredEntries.map(e => [
      format(new Date(e.date), 'dd/MM/yyyy'),
      e.journalId || '',
      e.reference || '',
      e.description || '',
      (e.totalDebit || 0).toLocaleString(),
      (e.totalCredit || 0).toLocaleString()
    ]);

    doc.autoTable({
      head: [['Date', 'Journal', 'Référence', 'Libellé', 'Débit', 'Crédit']],
      body: tableData,
      startY: 20,
    });

    doc.save(`brouillard_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success("PDF généré !");
  };

  const exportCSV = () => {
    const headers = ["Date", "Journal", "Référence", "Libellé", "Débit", "Crédit"];
    const rows = filteredEntries.map(e => [
      format(new Date(e.date), 'dd/MM/yyyy'),
      e.journalId || '',
      e.reference || '',
      e.description || '',
      e.totalDebit || 0,
      e.totalCredit || 0
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `brouillard_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("CSV exporté !");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brouillard</h1>
          <p className="text-muted-foreground">Consultation chronologique des écritures non validées.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportPDF}><Printer size={18} /> Imprimer</Button>
          <Button variant="outline" className="gap-2" onClick={exportCSV}><Download size={18} /> Exporter</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Écritures en cours</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-10 h-9" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm"><Filter size={16} /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{e.journalId}</TableCell>
                  <TableCell className="font-medium">{e.reference}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right">
                    {(e.totalDebit || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {(e.totalCredit || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Brouillard</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Aucune écriture dans le brouillard.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
