import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
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
import { Calculator, Download, Filter, RefreshCw, Calendar, Search, FileText, ArrowRight, TrendingUp, ChevronRight, PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadPDF } from '../lib/download-utils';
import { cn } from '@/lib/utils';
import { format, startOfYear, endOfYear } from 'date-fns';

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function Balance() {
  const { userData, company } = useAuth();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfYear(new Date()), 'yyyy-MM-dd'));
  const [accountClass, setAccountClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('table');

  const classNames: Record<string, string> = {
    '1': 'Capitaux',
    '2': 'Immobilisations',
    '3': 'Stocks',
    '4': 'Tiers',
    '5': 'Financiers',
    '6': 'Charges',
    '7': 'Produits'
  };

  const handleExportPDF = () => {
    const headers = [['N° Compte', 'Intitulé', 'Débit', 'Crédit', 'Solde Débiteur', 'Solde Créditeur']];
    const data = filteredBalances.map(b => [
      b.code,
      b.name,
      b.debit.toLocaleString(),
      b.credit.toLocaleString(),
      b.balance > 0 ? b.balance.toLocaleString() : '-',
      b.balance < 0 ? Math.abs(b.balance).toLocaleString() : '-'
    ]);
    
    const totalD = filteredBalances.reduce((sum, b) => sum + b.debit, 0);
    const totalC = filteredBalances.reduce((sum, b) => sum + b.credit, 0);
    const totalSD = filteredBalances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
    const totalSC = filteredBalances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0);
    
    data.push(['TOTAUX', '', totalD.toLocaleString(), totalC.toLocaleString(), totalSD.toLocaleString(), totalSC.toLocaleString()]);
    
    downloadPDF(`Balance Générale - ${company?.name}`, headers, data, `Balance_${startDate}_${endDate}`);
  };

  const fetchBalances = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const accountsSnap = await getDocs(query(collection(db, `companies/${userData.companyId}/accounts`)));
      const accounts = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const entriesQuery = query(
        collection(db, `companies/${userData.companyId}/journal_entries`),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const entriesSnap = await getDocs(entriesQuery);
      const entries = entriesSnap.docs.map(doc => doc.data());

      const balanceMap: Record<string, { debit: number; credit: number }> = {};
      
      entries.forEach((entry: any) => {
        if (!balanceMap[entry.accountId]) {
          balanceMap[entry.accountId] = { debit: 0, credit: 0 };
        }
        balanceMap[entry.accountId].debit += Number(entry.debit || 0);
        balanceMap[entry.accountId].credit += Number(entry.credit || 0);
      });

      const calculatedBalances: AccountBalance[] = accounts.map((acc: any) => {
        const totals = balanceMap[acc.id] || { debit: 0, credit: 0 };
        const balance = totals.debit - totals.credit;
        return {
          id: acc.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          debit: totals.debit,
          credit: totals.credit,
          balance: balance
        };
      }).sort((a, b) => a.code.localeCompare(b.code));

      setBalances(calculatedBalances);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/balance`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [userData, startDate, endDate]);

  const filteredBalances = balances.filter(b => {
    const matchesClass = accountClass === 'all' || b.code.startsWith(accountClass);
    const matchesSearch = b.code.includes(searchTerm) || b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasMovement = b.debit !== 0 || b.credit !== 0;
    return matchesClass && matchesSearch && hasMovement;
  });

  const totalDebit = filteredBalances.reduce((sum, b) => sum + b.debit, 0);
  const totalCredit = filteredBalances.reduce((sum, b) => sum + b.credit, 0);
  const totalSD = filteredBalances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
  const totalSC = filteredBalances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0);

  const classSummary = Object.keys(classNames).map(c => {
    const classBalances = balances.filter(b => b.code.startsWith(c));
    const debit = classBalances.reduce((sum, b) => sum + b.debit, 0);
    const credit = classBalances.reduce((sum, b) => sum + b.credit, 0);
    const balance = debit - credit;
    return { code: c, name: classNames[c], debit, credit, balance, count: classBalances.length };
  }).filter(c => c.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance Générale</h1>
          <p className="text-muted-foreground">Synthèse des mouvements et soldes par classe de comptes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBalances} disabled={loading} className="gap-2">
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
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Comptes Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">{filteredBalances.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="table" className="gap-2">
              <Layers size={14} /> Balance Détaillée
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <PieChart size={14} /> Par Classe
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1">
              <Calendar size={12} className="text-slate-400" />
              <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <ArrowRight size={12} className="text-slate-300" />
              <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <Select value={accountClass} onValueChange={setAccountClass}>
              <SelectTrigger className="h-9 w-40 bg-white">
                <SelectValue placeholder="Toutes classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes classes</SelectItem>
                {Object.entries(classNames).map(([code, name]) => (
                  <SelectItem key={code} value={code}>Classe {code} - {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9 h-9 w-48 bg-white text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        <TabsContent value="table" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[120px] text-[10px] uppercase font-bold pl-4">N° Compte</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Intitulé du compte</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Débit</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Crédit</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Solde Débiteur</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold pr-4">Solde Créditeur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.length > 0 ? (
                    filteredBalances.map((b) => (
                      <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-mono font-bold text-xs text-primary pl-4">{b.code}</TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">{b.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-600">{b.debit > 0 ? b.debit.toLocaleString() : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-600">{b.credit > 0 ? b.credit.toLocaleString() : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-600 font-black">
                          {b.balance > 0 ? b.balance.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-600 font-black pr-4">
                          {b.balance < 0 ? Math.abs(b.balance).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-32">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Calculator size={48} strokeWidth={1} />
                          <p className="text-sm">{loading ? "Calcul de la balance..." : "Aucun mouvement sur cette période"}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {filteredBalances.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-black border-t-2">
                    <TableRow className="hover:bg-slate-900">
                      <TableCell colSpan={2} className="text-[10px] uppercase pl-4 tracking-widest">Totaux de la sélection</TableCell>
                      <TableCell className="text-right font-mono text-xs">{totalDebit.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{totalCredit.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-emerald-400">{totalSD.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-rose-400 pr-4">{totalSC.toLocaleString()}</TableCell>
                    </TableRow>
                  </tfoot>
                )}
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classSummary.map(c => (
              <Card key={c.code} className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-black text-primary border-primary/20">CLASSE {c.code}</Badge>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{c.count} comptes</span>
                  </div>
                  <CardTitle className="text-lg font-black mt-2">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Débit</p>
                      <p className="text-sm font-black text-slate-900">{c.debit.toLocaleString()} {company?.currency}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Crédit</p>
                      <p className="text-sm font-black text-slate-900">{c.credit.toLocaleString()} {company?.currency}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Solde Net</span>
                      <div className={cn("text-sm font-black flex items-center gap-1", c.balance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {c.balance >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(c.balance).toLocaleString()} {company?.currency}
                      </div>
                    </div>
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
