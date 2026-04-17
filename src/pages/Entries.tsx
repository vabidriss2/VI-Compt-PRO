import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Calculator, 
  Search, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Activity,
  Calendar,
  ChevronRight,
  MoreVertical,
  ArrowDownLeft,
  ArrowUpRight,
  FileJson,
  History,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface EntryLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  analyticalId?: string;
}

export default function Entries() {
  const { userData, company } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [analyticalPlans, setAnalyticalPlans] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const generateReference = () => `PC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Form State
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [journalId, setJournalId] = useState('');
  const [reference, setReference] = useState(generateReference());
  const [lines, setLines] = useState<EntryLine[]>([
    { accountId: '', description: '', debit: 0, credit: 0 },
    { accountId: '', description: '', debit: 0, credit: 0 }
  ]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const unsubscribeAccs = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/accounts`)),
      (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`)
    );

    const unsubscribeJournals = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/journals`)),
      (snapshot) => setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`)
    );

    const unsubscribeAnalytical = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/analytical_plans`)),
      (snapshot) => setAnalyticalPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/analytical_plans`)
    );

    const unsubscribeTemplates = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/entry_templates`)),
      (snapshot) => setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/entry_templates`)
    );

    const unsubscribeRecent = onSnapshot(
      query(
        collection(db, `companies/${userData.companyId}/transactions`),
        orderBy('date', 'desc'),
        limit(20)
      ),
      (snapshot) => setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`)
    );

    return () => {
      unsubscribeAccs();
      unsubscribeJournals();
      unsubscribeAnalytical();
      unsubscribeTemplates();
      unsubscribeRecent();
    };
  }, [userData]);

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newLines = template.lines.map((l: any) => ({
      accountId: l.accountId,
      description: l.description || template.name,
      debit: l.defaultDebit || 0,
      credit: l.defaultCredit || 0
    }));
    setLines(newLines);
    toast.success(`Modèle "${template.name}" appliqué`);
  };

  const addLine = () => {
    setLines([...lines, { accountId: '', description: lines[lines.length - 1]?.description || '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof EntryLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    if (field === 'debit' && value > 0) newLines[index].credit = 0;
    if (field === 'credit' && value > 0) newLines[index].debit = 0;
    
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const filteredTransactions = recentTransactions.filter(tx => {
    const searchStr = `${tx.description} ${tx.reference} ${tx.journalId}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    const txDate = tx.date;
    const matchesStartDate = !startDate || txDate >= startDate;
    const matchesEndDate = !endDate || txDate <= endDate;
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleSave = async () => {
    if (!journalId) {
      toast.error("Veuillez sélectionner un journal.");
      return;
    }
    if (!isBalanced) {
      toast.error("L'écriture n'est pas équilibrée.");
      return;
    }

    setLoading(true);
    try {
      const txPath = `companies/${userData!.companyId}/transactions`;
      const txRef = await addDoc(collection(db, txPath), {
        date,
        journalId,
        reference,
        description: lines[0].description || "Saisie manuelle",
        companyId: userData!.companyId,
        createdBy: userData!.uid,
        createdAt: new Date().toISOString(),
        type: 'manual',
        totalAmount: totalDebit
      });

      const entryPath = `companies/${userData!.companyId}/journal_entries`;
      for (const line of lines) {
        if (line.accountId && (line.debit > 0 || line.credit > 0)) {
          await addDoc(collection(db, entryPath), {
            transactionId: txRef.id,
            accountId: line.accountId,
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            description: line.description,
            analyticalId: line.analyticalId || null,
            companyId: userData!.companyId,
            date,
            journalId
          });
        }
      }

      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'transactions', txRef.id, { date, journalId, reference });

      toast.success("Écriture enregistrée !");
      resetForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setReference(generateReference());
    setLines([
      { accountId: '', description: '', debit: 0, credit: 0 },
      { accountId: '', description: '', debit: 0, credit: 0 }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saisie Comptable</h1>
          <p className="text-muted-foreground italic text-sm">Enregistrez vos écritures avec précision et rapidité dans le grand livre.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-8 gap-2 bg-slate-50 border-slate-200 text-slate-600 font-mono">
            <Activity size={14} className={cn(loading && "animate-spin")} />
            Système Équilibré
          </Badge>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <Button variant="outline" size="sm" onClick={resetForm} className="gap-2">
            <RefreshCw size={14} /> Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced || loading} className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200">
            <Save size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Calcul..." : "Valider l'écriture"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-400" />
            <CardHeader className="bg-slate-50/30 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-900" />
                    Pièce Comptable
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400 mt-0.5">Configuration de l'en-tête de l'écriture</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">Modélisation :</span>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 w-48 text-[11px] font-black border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                      <SelectValue placeholder="Appliquer un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs font-bold">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="label-caps px-1 text-slate-500">Date d'opération</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-10 h-10 text-xs font-black border-slate-200 focus:border-slate-400 transition-colors bg-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="label-caps px-1 text-slate-500">Journal de saisie</Label>
                  <Select value={journalId} onValueChange={setJournalId}>
                    <SelectTrigger className="h-10 text-xs font-black border-slate-200 bg-white focus:border-slate-400 shadow-sm">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {journals.map(j => (
                        <SelectItem key={j.id} value={j.id} className="text-xs font-bold">{j.code} — {j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="label-caps px-1 text-slate-500">Référence / Pièce</Label>
                  <div className="relative">
                    <Input placeholder="ex: FAC-2024-001" value={reference} onChange={(e) => setReference(e.target.value)} className="h-10 text-xs font-mono font-black border-slate-200 pr-10 bg-white focus:border-slate-400" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-slate-300 hover:text-slate-600" onClick={() => setReference(generateReference())}>
                      <RefreshCw size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
            <div className="bg-slate-950 px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lignes de Transaction</span>
                <Badge variant="outline" className={cn(
                  "text-[9px] h-5 border-none font-black uppercase tracking-widest",
                  isBalanced ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                )}>
                  {isBalanced ? "Équilibrée" : "Déséquilibrée"}
                </Badge>
              </div>
              {totalDebit > 0 && !isBalanced && (
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-400" />
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Écart : {(totalDebit - totalCredit).toLocaleString()}</span>
                </div>
              )}
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="col-span-3">Compte Général (Plan)</div>
                  <div className="col-span-4">Libellé de l'opération</div>
                  <div className="col-span-2 text-right">Débit</div>
                  <div className="col-span-2 text-right">Crédit</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-slate-50/30 transition-colors animate-in fade-in slide-in-from-top-1">
                      <div className="col-span-3">
                        <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                          <SelectTrigger className="h-9 text-[11px] font-black border-slate-200 bg-white shadow-sm hover:bg-slate-50">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                          <SelectContent className="text-[11px] font-bold">
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id} className="font-mono text-xs">
                                <span className="font-black text-slate-900 mr-2">{acc.code}</span> — {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input 
                          placeholder="Description de la ligne..." 
                          className="h-9 text-[11px] font-black border-slate-200 bg-white shadow-sm"
                          value={line.description} 
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Input 
                          type="number" 
                          className="h-9 text-[11px] text-right font-mono font-black border-slate-200 bg-white shadow-sm text-emerald-600"
                          value={line.debit || ''} 
                          onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Input 
                          type="number" 
                          className="h-9 text-[11px] text-right font-mono font-black border-slate-200 bg-white shadow-sm text-rose-600"
                          value={line.credit || ''} 
                          onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all" 
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addLine} 
                  className="h-9 px-6 text-[10px] font-black uppercase tracking-widest border-slate-200 bg-white hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <Plus size={12} className="mr-2" /> Insérer une ligne
                </Button>
                <div className="flex items-center gap-12">
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-400 mb-1">Total Débit</p>
                    <p className="text-xl font-mono font-black text-slate-900">{totalDebit.toLocaleString()} {company?.currency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black tracking-[0.15em] text-slate-400 mb-1">Total Crédit</p>
                    <p className="text-xl font-mono font-black text-slate-900">{totalCredit.toLocaleString()} {company?.currency}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={cn(
            "border-none shadow-xl transition-all duration-300 overflow-hidden",
            isBalanced ? "bg-emerald-950 text-emerald-50" : "bg-rose-950 text-rose-50"
          )}>
            <div className="h-1 bg-white/10" />
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60">Audit Équilibre</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>Déséquilibre Actuel</span>
                  {isBalanced && <CheckCircle2 size={12} className="text-emerald-400" />}
                </div>
                <div className={cn(
                  "text-3xl font-mono font-black tracking-tight",
                  isBalanced ? "text-emerald-400" : "text-rose-400"
                )}>
                  {Math.abs(totalDebit - totalCredit).toLocaleString()} {company?.currency}
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Journal Actif</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-white/10 rounded-full">{journals.find(j => j.id === journalId)?.code || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Nombre de Lignes</span>
                  <span className="text-[9px] font-bold">{lines.length}</span>
                </div>
              </div>

              <Button 
                className={cn(
                  "w-full h-12 gap-2 text-xs font-black uppercase tracking-widest transition-all",
                  isBalanced 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20" 
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
                onClick={handleSave} 
                disabled={loading || !isBalanced || totalDebit === 0}
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                Valider l'Écriture
              </Button>
            </CardContent>
          </Card>
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="py-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <History size={14} className="text-indigo-500" />
                Dernières Saisies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                {filteredTransactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono font-bold border-slate-200 bg-white text-slate-600">{tx.reference}</Badge>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1 mb-3">{tx.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                          {journals.find(j => j.id === tx.journalId)?.code}
                        </div>
                        <span className="text-[10px] font-mono font-black text-slate-900">{(tx.totalAmount || 0).toLocaleString()} {company?.currency}</span>
                      </div>
                      <ChevronRight size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <FileText size={20} className="text-slate-300" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aucune écriture</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/10 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-indigo-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Assistance</span>
              </div>
              <p className="text-[10px] text-indigo-900 font-medium leading-relaxed">
                Utilisez les modèles pour automatiser vos saisies récurrentes.
              </p>
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-50">
                <Info size={14} className="text-indigo-400 shrink-0" />
                <p className="text-[9px] text-indigo-600 font-medium">
                  Raccourci: <kbd className="px-1 py-0.5 rounded bg-slate-100 border text-[8px]">Tab</kbd> pour naviguer entre les champs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
