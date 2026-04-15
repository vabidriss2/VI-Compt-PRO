import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Printer, Download, Filter, BookOpen, Calendar, Search, RefreshCw, ArrowRight, TrendingUp, FileText, ChevronDown, ChevronUp, Landmark, ShoppingCart, CreditCard, Banknote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { downloadPDF } from '../lib/download-utils';

export default function JournalReports() {
  const { userData, company } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('detailed');

  const journalIcons: Record<string, any> = {
    'VE': <ShoppingCart size={14} />,
    'AC': <ShoppingCart size={14} className="rotate-180" />,
    'BQ': <Landmark size={14} />,
    'CA': <Banknote size={14} />,
    'OD': <FileText size={14} />,
  };

  const handleExportPDF = () => {
    const headers = [['Date', 'Journal', 'Référence', 'Libellé', 'Débit', 'Crédit']];
    const data: any[] = [];
    
    filteredTransactions.forEach(tx => {
      tx.entries.forEach((entry: any, i: number) => {
        const account = accounts.find(a => a.id === entry.accountId);
        data.push([
          i === 0 ? format(new Date(tx.date), 'dd/MM/yyyy') : '',
          i === 0 ? (journals.find(j => j.id === tx.journalId)?.code || 'JRN') : '',
          i === 0 ? (tx.reference || tx.id.slice(0, 8).toUpperCase()) : '',
          entry.description || account?.name || '',
          entry.debit > 0 ? entry.debit.toLocaleString() : '-',
          entry.credit > 0 ? entry.credit.toLocaleString() : '-'
        ]);
      });
    });
    
    const totalD = filteredTransactions.reduce((sum, tx) => sum + tx.entries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0), 0);
    const totalC = filteredTransactions.reduce((sum, tx) => sum + tx.entries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0), 0);
    data.push(['TOTAUX', '', '', '', totalD.toLocaleString(), totalC.toLocaleString()]);
    
    downloadPDF(`Journaux Comptables - ${company?.name}`, headers, data, `Journaux_${startDate}_${endDate}`);
  };

  useEffect(() => {
    if (!userData?.companyId) return;

    const unsubscribeJournals = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/journals`)),
      (snapshot) => setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`)
    );

    const unsubscribeAccs = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/accounts`)),
      (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`)
    );

    return () => {
      unsubscribeJournals();
      unsubscribeAccs();
    };
  }, [userData]);

  useEffect(() => {
    if (!userData?.companyId) return;
    fetchTransactions();
  }, [userData, selectedJournal, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, `companies/${userData!.companyId}/transactions`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      if (selectedJournal !== 'all') {
        q = query(q, where('journalId', '==', selectedJournal));
      }

      const snapshot = await getDocs(q);
      const txs = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const txData = docSnap.data();
        const qEntries = query(
          collection(db, `companies/${userData!.companyId}/journal_entries`),
          where('transactionId', '==', docSnap.id)
        );
        const entriesSnap = await getDocs(qEntries);
        const entries = entriesSnap.docs.map(e => e.data());
        return { id: docSnap.id, ...txData, entries };
      }));
      setTransactions(txs);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDebit = filteredTransactions.reduce((sum, tx) => 
    sum + tx.entries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0), 0
  );
  const totalCredit = filteredTransactions.reduce((sum, tx) => 
    sum + tx.entries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0), 0
  );

  const journalSummary = journals.map(j => {
    const txs = filteredTransactions.filter(tx => tx.journalId === j.id);
    const debit = txs.reduce((sum, tx) => sum + tx.entries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0), 0);
    const credit = txs.reduce((sum, tx) => sum + tx.entries.reduce((s: number, e: any) => s + Number(e.credit || 0), 0), 0);
    return { ...j, debit, credit, count: txs.length };
  }).filter(j => j.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journaux Comptables</h1>
          <p className="text-muted-foreground">Consultation chronologique et analytique des écritures par journal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={fetchTransactions} disabled={loading}>
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Actualiser
          </Button>
          <Button size="sm" className="gap-2" onClick={handleExportPDF}>
            <Download size={14} /> Exporter PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Débit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalDebit.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Crédit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalCredit.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Nombre d'écritures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Journaux Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{journalSummary.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="detailed" className="gap-2">
              <BookOpen size={14} /> Vue Détaillée
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <TrendingUp size={14} /> Récapitulatif
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1">
              <Calendar size={12} className="text-slate-400" />
              <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <ArrowRight size={12} className="text-slate-300" />
              <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Select value={selectedJournal} onValueChange={setSelectedJournal}>
              <SelectTrigger className="h-9 w-48 bg-white">
                <SelectValue placeholder="Tous les journaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les journaux</SelectItem>
                {journals.map(j => (
                  <SelectItem key={j.id} value={j.id}>
                    <div className="flex items-center gap-2">
                      {journalIcons[j.code?.slice(0, 2)] || <BookOpen size={12} />}
                      {j.code} - {j.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9 h-9 w-48 bg-white text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <TabsContent value="detailed" className="m-0 space-y-6">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((tx) => (
              <Card key={tx.id} className="border-slate-200 shadow-sm overflow-hidden group hover:border-primary/30 transition-all">
                <CardHeader className="bg-slate-50/50 border-b py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center bg-white border rounded-lg px-3 py-1 shadow-sm">
                        <span className="text-[10px] font-black text-primary uppercase">{format(new Date(tx.date), 'MMM', { locale: fr })}</span>
                        <span className="text-lg font-black leading-none">{format(new Date(tx.date), 'dd')}</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{tx.description}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] font-bold bg-white text-primary border-primary/20">
                            {journals.find(j => j.id === tx.journalId)?.code || 'JRN'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">REF: {tx.reference || tx.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Total Écriture</p>
                        <p className="text-sm font-black text-slate-900">
                          {tx.entries.reduce((s: number, e: any) => s + Number(e.debit || 0), 0).toLocaleString()} {company?.currency}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Printer size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[120px] text-[10px] uppercase font-bold pl-4">Compte</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Libellé</TableHead>
                        <TableHead className="text-right w-[150px] text-[10px] uppercase font-bold">Débit</TableHead>
                        <TableHead className="text-right w-[150px] text-[10px] uppercase font-bold pr-4">Crédit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tx.entries?.map((entry: any, i: number) => {
                        const account = accounts.find(a => a.id === entry.accountId);
                        return (
                          <TableRow key={i} className="hover:bg-slate-50/50 border-none">
                            <TableCell className="font-mono text-[11px] font-bold text-primary pl-4">{account?.code || '???'}</TableCell>
                            <TableCell className="text-[11px] text-slate-600">{entry.description || account?.name}</TableCell>
                            <TableCell className="text-right font-mono text-[11px] font-bold text-emerald-600">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-[11px] font-bold text-rose-600 pr-4">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-32 bg-slate-50 border-2 border-dashed rounded-2xl">
              <BookOpen size={64} className="mx-auto mb-4 text-slate-200" />
              <p className="text-slate-500 font-medium">{loading ? "Chargement des écritures..." : "Aucune écriture trouvée pour cette période."}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {journalSummary.map(j => (
              <Card key={j.id} className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {journalIcons[j.code?.slice(0, 2)] || <BookOpen size={20} />}
                    </div>
                    <Badge variant="secondary" className="font-bold">{j.count} écritures</Badge>
                  </div>
                  <CardTitle className="text-lg font-black mt-4">{j.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">{j.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Débit</p>
                      <p className="text-sm font-black text-emerald-600">{j.debit.toLocaleString()} {company?.currency}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Crédit</p>
                      <p className="text-sm font-black text-rose-600">{j.credit.toLocaleString()} {company?.currency}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                      <span>Poids dans l'activité</span>
                      <span>{Math.round((j.debit / totalDebit) * 100)}%</span>
                    </div>
                    <Progress value={(j.debit / totalDebit) * 100} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
