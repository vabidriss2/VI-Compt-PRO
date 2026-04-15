import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  History, 
  Search, 
  Zap, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  Loader2, 
  Info, 
  ChevronRight, 
  MoreVertical, 
  Trash2, 
  RefreshCw,
  Calculator,
  ArrowRight,
  FileText,
  FileJson,
  ShieldCheck,
  Link as LinkIcon,
  Unlink,
  TrendingUp,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export default function Lettering() {
  const { userData } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [letteredEntries, setLetteredEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('unlettered');

  useEffect(() => {
    if (!userData?.companyId) return;

    const qUnlettered = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      where('lettering', '==', null)
    );

    const unsubscribeUnlettered = onSnapshot(qUnlettered, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLettered = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      where('lettering', '!=', null)
    );

    const unsubscribeLettered = onSnapshot(qLettered, (snapshot) => {
      setLetteredEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAccs = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccs = onSnapshot(qAccs, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeUnlettered();
      unsubscribeLettered();
      unsubscribeAccs();
    };
  }, [userData]);

  const toggleSelect = (id: string) => {
    setSelectedEntries(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedData = entries.filter(e => selectedEntries.includes(e.id));
  const totalDebit = selectedData.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = selectedData.reduce((sum, e) => sum + (e.credit || 0), 0);
  const diff = totalDebit - totalCredit;

  const handleLettering = async () => {
    if (selectedEntries.length < 2) {
      toast.error("Sélectionnez au moins deux écritures.");
      return;
    }
    if (Math.abs(diff) > 0.01) {
      toast.error("Le solde doit être nul pour lettrer.");
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const letteringCode = `MAN-${Date.now().toString(36).toUpperCase()}`;
      
      selectedEntries.forEach(id => {
        batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, id), { lettering: letteringCode });
      });

      await batch.commit();
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'lettering', letteringCode, { entries: selectedEntries });
      
      toast.success(`Lettrage ${letteringCode} effectué !`);
      setSelectedEntries([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lettering');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLettering = async () => {
    setLoading(true);
    try {
      // Group entries by account and amount
      const groups: { [key: string]: any[] } = {};
      entries.forEach(e => {
        const key = `${e.accountId}_${Math.abs(e.debit || e.credit)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(e);
      });

      const batch = writeBatch(db);
      let count = 0;

      Object.values(groups).forEach(group => {
        if (group.length === 2) {
          const [e1, e2] = group;
          // Check if one is debit and other is credit
          if ((e1.debit > 0 && e2.credit > 0) || (e1.credit > 0 && e2.debit > 0)) {
            const letteringCode = `AUTO-${Date.now().toString(36).toUpperCase()}-${count}`;
            batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, e1.id), { lettering: letteringCode });
            batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, e2.id), { lettering: letteringCode });
            count++;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
        toast.success(`${count} lettrages automatiques effectués !`);
      } else {
        toast.info("Aucune correspondance automatique trouvée.");
      }
    } catch (error) {
      toast.error("Erreur lors du lettrage automatique");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlettering = async (letteringCode: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const affected = letteredEntries.filter(e => e.lettering === letteringCode);
      
      affected.forEach(e => {
        batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, e.id), { lettering: null });
      });

      await batch.commit();
      toast.success(`Lettrage ${letteringCode} annulé.`);
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const account = accounts.find(acc => acc.id === e.accountId);
    const searchStr = `${e.label} ${account?.code} ${account?.name} ${e.description}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const groupedLettered = letteredEntries.reduce((acc: any, e) => {
    if (!acc[e.lettering]) acc[e.lettering] = [];
    acc[e.lettering].push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lettrage Comptable</h1>
          <p className="text-muted-foreground">Réconciliez vos factures avec les règlements pour un suivi précis des tiers.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 gap-2" onClick={() => toast.info("Exportation bientôt disponible")}>
            <FileJson size={14} /> Exporter
          </Button>
          <Button size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100" onClick={handleAutoLettering} disabled={loading || entries.length === 0}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
            Lettrage Automatique
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">À Lettrer</p>
                <h3 className="text-3xl font-black text-slate-900">{entries.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Lettrés (30j)</p>
                <h3 className="text-3xl font-black text-emerald-600">{letteredEntries.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Taux de Lettrage</p>
                <h3 className="text-3xl font-black text-blue-600">
                  {entries.length + letteredEntries.length > 0 
                    ? Math.round((letteredEntries.length / (entries.length + letteredEntries.length)) * 100) 
                    : 100}%
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 p-1 h-11 border border-slate-200 shadow-sm">
            <TabsTrigger value="unlettered" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
              <ArrowRightLeft size={14} /> Écritures en attente
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
              <History size={14} /> Historique des lettrages
            </TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Compte, libellé, montant..." 
              className="pl-10 h-10 text-xs font-bold border-slate-200 focus:border-indigo-500 shadow-sm" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <TabsContent value="unlettered" className="m-0">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedEntries(filteredEntries.map(e => e.id));
                              else setSelectedEntries([]);
                            }}
                          />
                        </TableHead>
                        <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                        <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest">Compte</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Libellé de l'écriture</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Débit</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Crédit</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Solde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length > 0 ? (
                        filteredEntries.map((entry) => {
                          const account = accounts.find(acc => acc.id === entry.accountId);
                          const isSelected = selectedEntries.includes(entry.id);
                          return (
                            <TableRow 
                              key={entry.id} 
                              className={cn(
                                "group cursor-pointer transition-colors border-b last:border-0",
                                isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50/50"
                              )}
                              onClick={() => toggleSelect(entry.id)}
                            >
                              <TableCell onClick={(ev) => ev.stopPropagation()}>
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(entry.id)} />
                              </TableCell>
                              <TableCell className="text-[11px] font-medium text-slate-500">{entry.date}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white border-slate-200 text-slate-600">
                                  {account?.code || entry.accountId}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-bold text-xs text-slate-900">{entry.description || entry.label}</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{entry.reference}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                                {entry.debit ? entry.debit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                                {entry.credit ? entry.credit.toLocaleString() : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-black text-indigo-600">
                                {((entry.debit || 0) - (entry.credit || 0)).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-24">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                <CheckCircle2 size={32} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tout est lettré !</p>
                                <p className="text-[10px] text-slate-400 font-medium">Aucune écriture en attente de réconciliation.</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                        <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest">Code</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Écritures</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Total</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(groupedLettered).length > 0 ? (
                        Object.entries(groupedLettered).map(([code, group]: [string, any]) => (
                          <TableRow key={code} className="group hover:bg-slate-50/50 transition-colors border-b last:border-0">
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-[9px] font-black uppercase tracking-widest bg-indigo-50 border-indigo-100 text-indigo-600">
                                {code}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5 py-2">
                                {group.map((e: any) => (
                                  <div key={e.id} className="flex items-center gap-3 text-[10px]">
                                    <span className="text-slate-400 font-medium">{e.date}</span>
                                    <span className="font-bold text-slate-700">{e.description || e.label}</span>
                                    <span className={cn("font-mono font-black", e.debit > 0 ? "text-emerald-600" : "text-rose-600")}>
                                      ({(e.debit || e.credit).toLocaleString()})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-black text-slate-900">
                              {group.reduce((sum: number, e: any) => sum + (e.debit || e.credit), 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                      onClick={() => handleUnlettering(code)}
                                      disabled={loading}
                                    >
                                      <Unlink size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-[10px] font-black uppercase tracking-widest text-rose-500">Délettrer l'écriture</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-24">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                <History size={32} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Aucun historique</p>
                                <p className="text-[10px] text-slate-400 font-medium">Les écritures lettrées apparaîtront ici.</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm overflow-hidden sticky top-6">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <Calculator size={14} className="text-indigo-500" />
                  Résumé de sélection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Écritures</span>
                    <span className="text-xs font-black text-slate-900">{selectedEntries.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Débit</span>
                    <span className="text-xs font-mono font-black text-emerald-600">{totalDebit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Crédit</span>
                    <span className="text-xs font-mono font-black text-rose-600">{totalCredit.toLocaleString()}</span>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all shadow-sm",
                  Math.abs(diff) < 0.01 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
                )}>
                  <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Écart de lettrage</span>
                  <span className={cn(
                    "text-2xl font-black font-mono",
                    Math.abs(diff) < 0.01 ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {diff.toLocaleString()}
                  </span>
                  {Math.abs(diff) < 0.01 && selectedEntries.length >= 2 ? (
                    <Badge className="bg-emerald-500 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Prêt à lettrer</Badge>
                  ) : (
                    <Badge className="bg-rose-500 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Écart non nul</Badge>
                  )}
                </div>

                <Button 
                  className={cn(
                    "w-full h-11 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all",
                    selectedEntries.length >= 2 && Math.abs(diff) < 0.01 ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                  disabled={selectedEntries.length < 2 || Math.abs(diff) > 0.01 || loading}
                  onClick={handleLettering}
                >
                  {loading ? <Loader2 className="animate-spin mr-2" size={14} /> : <LinkIcon className="mr-2" size={14} />}
                  Valider le lettrage
                </Button>
                
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                    Le lettrage permet de pointer les factures payées. L'écart entre débit et crédit doit être strictement nul.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
