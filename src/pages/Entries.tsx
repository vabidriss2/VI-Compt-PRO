import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
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
import { Plus, Trash2, Save, RefreshCw, Calculator, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

interface EntryLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  analyticalId?: string;
}

export default function Entries() {
  const { userData } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [analyticalPlans, setAnalyticalPlans] = useState<any[]>([]);
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

    // Fetch Accounts
    const unsubscribeAccs = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/accounts`)),
      (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`)
    );

    // Fetch Journals
    const unsubscribeJournals = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/journals`)),
      (snapshot) => setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`)
    );

    // Fetch Analytical Plans
    const unsubscribeAnalytical = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/analytical_plans`)),
      (snapshot) => setAnalyticalPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/analytical_plans`)
    );

    // Fetch Recent Transactions
    const unsubscribeRecent = onSnapshot(
      query(
        collection(db, `companies/${userData.companyId}/transactions`),
        orderBy('date', 'desc')
      ),
      (snapshot) => setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`)
    );

    return () => {
      unsubscribeAccs();
      unsubscribeJournals();
      unsubscribeAnalytical();
      unsubscribeRecent();
    };
  }, [userData]);

  const addLine = () => {
    setLines([...lines, { accountId: '', description: lines[lines.length - 1]?.description || '', debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof EntryLine, value: any) => {
    if ((field === 'debit' || field === 'credit') && value < 0) {
      toast.error("Le montant doit être positif.");
      return;
    }

    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-balance logic helper (optional, but nice)
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
      // 1. Create Transaction
      const txPath = `companies/${userData!.companyId}/transactions`;
      const txRef = await addDoc(collection(db, txPath), {
        date,
        journalId,
        reference,
        description: lines[0].description || "Saisie manuelle",
        companyId: userData!.companyId,
        createdBy: userData!.uid,
        createdAt: new Date().toISOString(),
        type: 'manual'
      });

      // 2. Create Journal Entries
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
          <p className="text-muted-foreground">Enregistrez vos écritures quotidiennes avec ventilation analytique.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm}>
            <RefreshCw size={18} className="mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave} disabled={!isBalanced || loading} className="gap-2">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Synchronisation..." : "Sauvegarder & Synchroniser"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entête de l'écriture</CardTitle>
          <CardDescription>Informations générales de la pièce comptable.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Date d'écriture</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Journal</Label>
              <Select value={journalId} onValueChange={setJournalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un journal" />
                </SelectTrigger>
                <SelectContent>
                  {journals.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.code} - {j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Référence / N° Pièce</Label>
              <Input placeholder="ex: FAC-2024-001" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Summary Header */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Date</span>
            <span className="text-sm font-semibold">{date ? format(new Date(date), 'dd/MM/yyyy') : '-'}</span>
          </div>
          <div className="flex flex-col border-l pl-6">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Journal</span>
            <span className="text-sm font-semibold">
              {journals.find(j => j.id === journalId)?.code || '-'}
            </span>
          </div>
          <div className="flex flex-col border-l pl-6">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Référence</span>
            <span className="text-sm font-semibold font-mono">{reference || '-'}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={isBalanced ? "default" : "destructive"} className="px-3 py-1">
            {isBalanced ? "Équilibrée" : "Non équilibrée"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lignes d'écriture</CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <div className={isBalanced ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                Écart: {(totalDebit - totalCredit).toLocaleString()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 font-semibold text-xs text-muted-foreground uppercase px-2">
              <div className="col-span-2">Compte</div>
              <div className="col-span-3">Libellé</div>
              <div className="col-span-2">Analytique</div>
              <div className="col-span-1">Code Ana.</div>
              <div className="col-span-1.5 text-right">Débit</div>
              <div className="col-span-1.5 text-right">Crédit</div>
              <div className="col-span-1"></div>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-all hover:bg-muted/30 hover:shadow-sm group">
                <div className="col-span-2">
                  <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input 
                    placeholder="Libellé de la ligne" 
                    value={line.description} 
                    onChange={(e) => updateLine(index, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Select value={line.analyticalId} onValueChange={(v) => updateLine(index, 'analyticalId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {analyticalPlans.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input 
                    readOnly 
                    disabled 
                    value={analyticalPlans.find(p => p.id === line.analyticalId)?.code || ''} 
                    className="h-9 text-xs font-mono bg-muted cursor-not-allowed"
                    placeholder="Code"
                  />
                </div>
                <div className="col-span-1.5">
                  <Input 
                    type="number" 
                    min="0"
                    className="text-right" 
                    value={line.debit || ''} 
                    onChange={(e) => updateLine(index, 'debit', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1.5">
                  <Input 
                    type="number" 
                    min="0"
                    className="text-right" 
                    value={line.credit || ''} 
                    onChange={(e) => updateLine(index, 'credit', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 2}>
                    <Trash2 size={16} className="text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" size="sm" onClick={addLine} className="gap-2">
                <Plus size={14} /> Ajouter une ligne
              </Button>
              
              <div className="flex gap-8 text-sm font-bold">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase">Total Débit</span>
                  <span>{totalDebit.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground uppercase">Total Crédit</span>
                  <span>{totalCredit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Historique des écritures</CardTitle>
              <CardDescription>Consultez et filtrez les dernières écritures enregistrées.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Du:</span>
                <Input 
                  type="date" 
                  className="h-8 w-36 text-xs" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">au:</span>
                <Input 
                  type="date" 
                  className="h-8 w-36 text-xs" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
              <div className="relative w-48">
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-9 h-8 text-xs" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="group">
                    <TableCell className="text-sm">
                      {format(new Date(tx.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {journals.find(j => j.id === tx.journalId)?.code || 'JRN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Calculator size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Aucune écriture trouvée pour cette période.
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
