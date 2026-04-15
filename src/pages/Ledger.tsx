import { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, where, onSnapshot } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Filter, Download, Calendar, ArrowRightLeft, ChevronDown, ChevronRight, FileText, ArrowUpRight, ArrowDownRight, BookOpen, Layers, ListFilter, Eye, Printer, RefreshCw, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { cn } from '@/lib/utils';
import { downloadPDF } from '../lib/download-utils';

interface LedgerEntry {
  id: string;
  date: string;
  journalId: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AccountLedger {
  accountId: string;
  code: string;
  name: string;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
}

export default function Ledger() {
  const { userData, company } = useAuth();
  const [ledgers, setLedgers] = useState<AccountLedger[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'balance' | 'movement'>('all');

  const fetchLedger = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const accsSnap = await getDocs(query(collection(db, `companies/${userData.companyId}/accounts`)));
      const accs = accsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAccounts(accs);

      const journalsSnap = await getDocs(query(collection(db, `companies/${userData.companyId}/journals`)));
      setJournals(journalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const entriesQuery = query(
        collection(db, `companies/${userData.companyId}/journal_entries`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const entriesSnap = await getDocs(entriesQuery);
      const allEntries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const grouped: Record<string, AccountLedger> = {};
      accs.forEach(acc => {
        grouped[acc.id] = {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          finalBalance: 0
        };
      });

      allEntries.forEach((entry: any) => {
        if (grouped[entry.accountId]) {
          const ledger = grouped[entry.accountId];
          const debit = Number(entry.debit || 0);
          const credit = Number(entry.credit || 0);
          ledger.totalDebit += debit;
          ledger.totalCredit += credit;
          const prevBalance = ledger.entries.length > 0 ? ledger.entries[ledger.entries.length - 1].balance : 0;
          const currentBalance = prevBalance + debit - credit;
          ledger.entries.push({
            id: entry.id,
            date: entry.date,
            journalId: entry.journalId,
            reference: entry.reference || 'N/A',
            description: entry.description || 'Sans libellé',
            debit,
            credit,
            balance: currentBalance
          });
        }
      });

      const finalLedgers = Object.values(grouped)
        .filter(l => {
          if (filterType === 'movement') return l.entries.length > 0;
          if (filterType === 'balance') return Math.abs(l.totalDebit - l.totalCredit) > 0.01;
          return true;
        })
        .map(l => ({ ...l, finalBalance: l.totalDebit - l.totalCredit }))
        .sort((a, b) => a.code.localeCompare(b.code));

      setLedgers(finalLedgers);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/ledger`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [userData, startDate, endDate, filterType]);

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredLedgers = ledgers.filter(l => 
    l.code.includes(searchTerm) || 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportPDF = () => {
    const headers = [['Date', 'Journal', 'Référence', 'Libellé', 'Débit', 'Crédit', 'Solde']];
    const data: any[] = [];

    filteredLedgers.forEach(l => {
      data.push([{ content: `Compte: ${l.code} - ${l.name}`, colSpan: 7, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
      l.entries.forEach(e => {
        data.push([
          format(new Date(e.date), 'dd/MM/yyyy'),
          journals.find(j => j.id === e.journalId)?.code || 'N/A',
          e.reference,
          e.description,
          e.debit.toLocaleString(),
          e.credit.toLocaleString(),
          e.balance.toLocaleString()
        ]);
      });
      data.push([
        { content: 'TOTAUX COMPTE', colSpan: 4, styles: { fontStyle: 'bold' } },
        l.totalDebit.toLocaleString(),
        l.totalCredit.toLocaleString(),
        l.finalBalance.toLocaleString()
      ]);
    });

    downloadPDF(`Grand Livre - ${company?.name}`, headers, data, `GrandLivre_${startDate}_${endDate}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grand Livre</h1>
          <p className="text-muted-foreground">Historique exhaustif et détaillé des mouvements par compte.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLedger} disabled={loading} className="gap-2">
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
            <div className="text-2xl font-black text-slate-900">
              {filteredLedgers.reduce((sum, l) => sum + l.totalDebit, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Crédit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {filteredLedgers.reduce((sum, l) => sum + l.totalCredit, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Comptes avec mouvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{filteredLedgers.filter(l => l.entries.length > 0).length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Solde Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">
              {filteredLedgers.reduce((sum, l) => sum + l.finalBalance, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
                <Calendar size={14} className="text-slate-400" />
                <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <ArrowRight size={14} className="text-slate-300" />
                <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                <Button variant={filterType === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px] px-2" onClick={() => setFilterType('all')}>Tous</Button>
                <Button variant={filterType === 'movement' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px] px-2" onClick={() => setFilterType('movement')}>Mouvements</Button>
                <Button variant={filterType === 'balance' ? 'secondary' : 'ghost'} size="sm" className="h-7 text-[10px] px-2" onClick={() => setFilterType('balance')}>Soldés</Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un compte..." className="pl-9 h-9 w-64 bg-white text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setExpandedAccounts(new Set(ledgers.map(l => l.accountId)))}>
                <Layers size={14} className="mr-2" /> Développer tout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredLedgers.map((ledger) => (
              <div key={ledger.accountId} className="overflow-hidden group">
                <div 
                  className={cn(
                    "flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-all",
                    expandedAccounts.has(ledger.accountId) && "bg-slate-50/80 border-b border-slate-200"
                  )}
                  onClick={() => toggleAccount(ledger.accountId)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-transform", expandedAccounts.has(ledger.accountId) ? "rotate-180 bg-primary text-white" : "bg-slate-100 text-slate-400")}>
                      <ChevronDown size={14} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-primary text-sm tracking-tight">{ledger.code}</span>
                        <span className="font-black text-slate-900 text-sm">{ledger.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-tighter h-4 px-1">
                          {ledger.entries.length} écritures
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-12">
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Débit</p>
                      <p className="text-sm font-black text-slate-900">{ledger.totalDebit.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Crédit</p>
                      <p className="text-sm font-black text-slate-900">{ledger.totalCredit.toLocaleString()}</p>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">Solde Final</p>
                      <div className={cn("text-sm font-black flex items-center justify-end gap-1", ledger.finalBalance >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {ledger.finalBalance >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(ledger.finalBalance).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                {expandedAccounts.has(ledger.accountId) && (
                  <div className="bg-white p-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[100px] text-[10px] uppercase font-bold pl-6">Date</TableHead>
                            <TableHead className="w-[80px] text-[10px] uppercase font-bold">Jrn</TableHead>
                            <TableHead className="w-[120px] text-[10px] uppercase font-bold">Référence</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold">Libellé de l'opération</TableHead>
                            <TableHead className="text-right w-[120px] text-[10px] uppercase font-bold">Débit</TableHead>
                            <TableHead className="text-right w-[120px] text-[10px] uppercase font-bold">Crédit</TableHead>
                            <TableHead className="text-right w-[120px] text-[10px] uppercase font-bold pr-6">Cumul</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.entries.map((entry) => (
                            <TableRow key={entry.id} className="hover:bg-slate-50/50 border-slate-100">
                              <TableCell className="text-[11px] font-medium pl-6">{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] h-4 px-1 font-mono bg-white">
                                  {journals.find(j => j.id === entry.journalId)?.code || '??'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-[11px] font-mono text-slate-500">{entry.reference}</TableCell>
                              <TableCell className="text-[11px] text-slate-700 font-medium">{entry.description}</TableCell>
                              <TableCell className="text-right font-mono text-[11px] font-bold text-emerald-600">{entry.debit > 0 ? entry.debit.toLocaleString() : '-'}</TableCell>
                              <TableCell className="text-right font-mono text-[11px] font-bold text-rose-600">{entry.credit > 0 ? entry.credit.toLocaleString() : '-'}</TableCell>
                              <TableCell className="text-right font-mono text-[11px] font-black pr-6 text-slate-900">{entry.balance.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredLedgers.length === 0 && (
              <div className="py-32 text-center bg-slate-50 rounded-b-xl">
                <BookOpen size={64} className="mx-auto mb-4 text-slate-200" strokeWidth={1} />
                <p className="text-slate-500 font-medium">{loading ? "Chargement du grand livre..." : "Aucun mouvement trouvé pour ces critères."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
