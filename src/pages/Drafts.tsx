import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Printer, Download, Search, Filter, FileText, Loader2, CheckCircle2, XCircle, AlertCircle, ArrowRight, Lock, Unlock, MoreHorizontal, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { logAction } from '../lib/audit';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Drafts() {
  const { userData, company } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  useEffect(() => {
    if (!userData?.companyId) return;
    
    const q = query(
      collection(db, `companies/${userData.companyId}/transactions`),
      where('status', '==', 'draft'),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`);
    });
  }, [userData]);

  const handleValidate = async (entryId: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, `companies/${userData!.companyId}/transactions`, entryId), { status: 'validated', validatedAt: serverTimestamp(), validatedBy: userData!.uid });
      await batch.commit();
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'transactions', entryId, { status: 'validated' });
      toast.success("Écriture validée et verrouillée.");
    } catch (error) {
      toast.error("Erreur lors de la validation");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkValidate = async () => {
    if (selectedEntries.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedEntries.forEach(id => {
        batch.update(doc(db, `companies/${userData!.companyId}/transactions`, id), { status: 'validated', validatedAt: serverTimestamp(), validatedBy: userData!.uid });
      });
      await batch.commit();
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'transactions', 'bulk', { count: selectedEntries.length });
      toast.success(`${selectedEntries.length} écritures validées.`);
      setSelectedEntries([]);
    } catch (error) {
      toast.error("Erreur lors de la validation groupée");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const searchStr = `${e.description} ${e.reference} ${e.journalId}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    
    const entryDate = e.date; // Assuming yyyy-mm-dd format
    const matchesStartDate = !startDate || entryDate >= startDate;
    const matchesEndDate = !endDate || entryDate <= endDate;
    
    return matchesSearch && matchesStartDate && matchesEndDate;
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

    autoTable(doc, {
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

  const totalDebit = filteredEntries.reduce((sum, e) => sum + (e.totalDebit || 0), 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.totalCredit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brouillard Comptable</h1>
          <p className="text-muted-foreground">Consultation chronologique et validation des écritures provisoires.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportPDF}>
            <Printer size={14} /> Imprimer
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
            <Download size={14} /> Exporter
          </Button>
          {selectedEntries.length > 0 && (
            <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleBulkValidate} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              Valider ({selectedEntries.length})
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Débit (Période)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalDebit.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Crédit (Période)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalCredit.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-2", Math.abs(totalDebit - totalCredit) < 0.01 ? "border-emerald-100 bg-emerald-50/30" : "border-rose-100 bg-rose-50/30")}>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-[10px] uppercase font-bold tracking-wider", Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-600" : "text-rose-600")}>Équilibre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-700" : "text-rose-700")}>
              {(totalDebit - totalCredit).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              ÉCRITURES EN ATTENTE
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Période</span>
                <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <ArrowRight size={12} className="text-slate-300" />
                <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-9 h-9 w-64 bg-white" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-white">
                <Filter size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox 
                    checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedEntries(filteredEntries.map(e => e.id));
                      else setSelectedEntries([]);
                    }}
                  />
                </TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Journal</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Référence</TableHead>
                <TableHead className="text-[10px] uppercase font-bold">Libellé</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Débit</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Crédit</TableHead>
                <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(e => (
                <TableRow key={e.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <Checkbox 
                      checked={selectedEntries.includes(e.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedEntries([...selectedEntries, e.id]);
                        else setSelectedEntries(selectedEntries.filter(id => id !== e.id));
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-xs font-medium">{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">{e.journalId}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-900">{e.reference}</TableCell>
                  <TableCell className="text-xs text-slate-600">{e.description}</TableCell>
                  <TableCell className="text-right font-bold text-xs text-emerald-600">
                    {(e.totalDebit || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs text-rose-600">
                    {(e.totalCredit || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2">
                          <Eye size={14} /> Détails
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-emerald-600" onClick={() => handleValidate(e.id)}>
                          <CheckCircle2 size={14} /> Valider
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-rose-600">
                          <XCircle size={14} /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={48} strokeWidth={1} />
                      <p className="text-sm">Aucune écriture dans le brouillard</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest justify-center">
        <Lock size={10} /> Les écritures validées sont verrouillées et ne peuvent plus être modifiées.
      </div>
    </div>
  );
}
