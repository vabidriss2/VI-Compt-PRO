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
          <p className="text-muted-foreground">Enregistrez vos écritures avec précision et rapidité dans le grand livre.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetForm} className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50">
            <RefreshCw size={14} className="mr-2" /> Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced || loading} className="h-10 px-6 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200">
            <Save size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Enregistrement..." : "Valider l'écriture"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Entête de Pièce Comptable</CardTitle>
                  <CardDescription className="text-[10px] font-medium">Informations générales de l'écriture.</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Modèle :</Label>
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 w-48 text-[10px] font-bold border-slate-200 bg-white">
                      <SelectValue placeholder="Appliquer un modèle" />
                    </SelectTrigger>
                    <SelectContent className="text-[10px] font-bold">
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Date d'opération</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Journal de saisie</Label>
                  <Select value={journalId} onValueChange={setJournalId}>
                    <SelectTrigger className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500">
                      <SelectValue placeholder="Sélectionner un journal" />
                    </SelectTrigger>
                    <SelectContent className="text-xs font-bold">
                      {journals.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.code} - {j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Référence Pièce</Label>
                  <div className="relative">
                    <Input placeholder="ex: FAC-2024-001" value={reference} onChange={(e) => setReference(e.target.value)} className="h-10 text-xs font-mono font-bold border-slate-200 pr-10" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-8 w-8 text-slate-400" onClick={() => setReference(generateReference())}>
                      <RefreshCw size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Lignes d'Écriture</span>
                <Badge variant="outline" className={cn(
                  "text-[9px] h-5 border-none font-black uppercase tracking-widest",
                  isBalanced ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
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
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <div className="col-span-3">Compte Général</div>
                  <div className="col-span-4">Libellé de l'opération</div>
                  <div className="col-span-2 text-right">Débit</div>
                  <div className="col-span-2 text-right">Crédit</div>
                  <div className="col-span-1"></div>
                </div>
                {lines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-slate-50/50 transition-colors">
                    <div className="col-span-3">
                      <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                        <SelectTrigger className="h-9 text-[11px] font-bold border-slate-200 bg-white focus:ring-0 focus:border-indigo-500">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="text-[11px] font-bold">
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input 
                        placeholder="Description de la ligne" 
                        className="h-9 text-[11px] font-medium border-slate-200 focus:border-indigo-500"
                        value={line.description} 
                        onChange={(e) => updateLine(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <Input 
                          type="number" 
                          className="h-9 text-[11px] text-right font-mono font-bold border-slate-200 focus:border-indigo-500 pr-2"
                          value={line.debit || ''} 
                          onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="relative">
                        <Input 
                          type="number" 
                          className="h-9 text-[11px] text-right font-mono font-bold border-slate-200 focus:border-indigo-500 pr-2"
                          value={line.credit || ''} 
                          onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all" onClick={() => removeLine(index)}>
                              <Trash2 size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] font-bold uppercase tracking-widest">Supprimer la ligne</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between border-t border-slate-100 gap-6">
                <Button variant="outline" size="sm" onClick={addLine} className="h-9 px-6 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-white hover:text-indigo-600 shadow-sm">
                  <Plus size={14} className="mr-2" /> Ajouter une ligne
                </Button>
                <div className="flex items-center gap-10">
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">Total Débit</p>
                    <p className="text-lg font-mono font-black text-slate-900">{totalDebit.toLocaleString()} <span className="text-[10px] text-slate-400">{company?.currency}</span></p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 hidden md:block" />
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-1">Total Crédit</p>
                    <p className="text-lg font-mono font-black text-slate-900">{totalCredit.toLocaleString()} <span className="text-[10px] text-slate-400">{company?.currency}</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b bg-slate-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <History size={14} className="text-indigo-500" />
                Dernières Saisies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredTransactions.map((tx) => (
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
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={14} className="text-indigo-500" />
                      </Button>
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

          <Card className="border-indigo-100 bg-indigo-50/30 overflow-hidden">
            <CardHeader className="py-4 border-b border-indigo-100 bg-indigo-50/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                <Calculator size={14} /> Outils d'Assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                <p className="text-[10px] text-indigo-900 font-bold leading-relaxed mb-3">
                  Automatisez vos saisies récurrentes en créant des modèles personnalisés.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700" onClick={() => toast.info("Calculatrice intégrée bientôt disponible")}>
                    <Calculator size={12} className="mr-2" /> Calculatrice
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700" onClick={() => toast.info("Importation de masse bientôt disponible")}>
                    <ArrowDownLeft size={12} className="mr-2" /> Import CSV/Excel
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 bg-white/50 rounded-lg border border-indigo-50">
                <Info size={14} className="text-indigo-400 shrink-0" />
                <p className="text-[9px] text-indigo-600 font-medium">
                  Appuyez sur <kbd className="px-1 py-0.5 rounded bg-slate-100 border text-[8px]">Tab</kbd> pour naviguer rapidement entre les champs.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
