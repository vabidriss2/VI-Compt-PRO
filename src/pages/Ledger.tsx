import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, Timestamp, where, getDocs } from 'firebase/firestore';
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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Search, Filter, Calendar as CalendarIcon, ArrowRightLeft, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

interface Entry {
  accountId: string;
  debit: number;
  credit: number;
}

export default function Ledger() {
  const { userData, company } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Transaction State
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [journalCode, setJournalCode] = useState('OD');
  const [entries, setEntries] = useState<Entry[]>([
    { accountId: '', debit: 0, credit: 0 },
    { accountId: '', debit: 0, credit: 0 }
  ]);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch Transactions
    const qTxs = query(
      collection(db, `companies/${userData.companyId}/transactions`),
      orderBy('date', 'desc')
    );
    const unsubscribeTxs = onSnapshot(qTxs, async (snapshot) => {
      const txs = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const txData = docSnap.data();
        // Fetch journal entries for this transaction
        const qEntries = query(
          collection(db, `companies/${userData.companyId}/journal_entries`),
          where('transactionId', '==', docSnap.id)
        );
        const entriesSnap = await getDocs(qEntries);
        const entries = entriesSnap.docs.map(e => e.data());
        return { id: docSnap.id, ...txData, entries };
      }));
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`);
    });

    // Fetch Accounts for dropdown
    const qAccs = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccs = onSnapshot(qAccs, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`);
    });

    return () => {
      unsubscribeTxs();
      unsubscribeAccs();
    };
  }, [userData]);

  const addEntryRow = () => {
    setEntries([...entries, { accountId: '', debit: 0, credit: 0 }]);
  };

  const removeEntryRow = (index: number) => {
    if (entries.length <= 2) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof Entry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSaveTransaction = async () => {
    if (!isBalanced) {
      toast.error("La transaction n'est pas équilibrée (Débit ≠ Crédit).");
      return;
    }
    if (!description) {
      toast.error("Veuillez saisir une description.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create Transaction
      const txPath = `companies/${userData.companyId}/transactions`;
      const txRef = await addDoc(collection(db, txPath), {
        date,
        description,
        reference,
        journalCode,
        companyId: userData.companyId,
        createdBy: userData.uid,
        createdAt: new Date().toISOString()
      });

      // 2. Create Journal Entries
      const entryPath = `companies/${userData.companyId}/journal_entries`;
      for (const entry of entries) {
        if (entry.accountId && (entry.debit > 0 || entry.credit > 0)) {
          await addDoc(collection(db, entryPath), {
            transactionId: txRef.id,
            accountId: entry.accountId,
            debit: Number(entry.debit || 0),
            credit: Number(entry.credit || 0),
            companyId: userData.companyId
          });
        }
      }

      toast.success("Transaction enregistrée !");
      setIsAddOpen(false);
      resetForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setDescription('');
    setReference('');
    setJournalCode('OD');
    setEntries([
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grand Livre</h1>
          <p className="text-muted-foreground">Historique complet de toutes les écritures comptables.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouvelle Écriture
            </Button>
          } />
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Saisir une écriture comptable</DialogTitle>
              <DialogDescription>Enregistrez une transaction en respectant le principe de la partie double.</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Journal</Label>
                  <Select value={journalCode} onValueChange={setJournalCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Journal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Achats (AC)</SelectItem>
                      <SelectItem value="VE">Ventes (VE)</SelectItem>
                      <SelectItem value="BQ">Banque (BQ)</SelectItem>
                      <SelectItem value="CA">Caisse (CA)</SelectItem>
                      <SelectItem value="OD">Opérations Diverses (OD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Libellé / Description</Label>
                  <Input placeholder="ex: Paiement facture loyer" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 font-semibold text-sm px-2">
                  <div className="col-span-6">Compte</div>
                  <div className="col-span-2 text-right">Débit</div>
                  <div className="col-span-2 text-right">Crédit</div>
                  <div className="col-span-2"></div>
                </div>
                
                {entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Select 
                        value={entry.accountId} 
                        onValueChange={(v) => updateEntry(index, 'accountId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un compte" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        className="text-right" 
                        value={entry.debit || ''} 
                        onChange={(e) => updateEntry(index, 'debit', Number(e.target.value))}
                        disabled={entry.credit > 0}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        className="text-right" 
                        value={entry.credit || ''} 
                        onChange={(e) => updateEntry(index, 'credit', Number(e.target.value))}
                        disabled={entry.debit > 0}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeEntryRow(index)} disabled={entries.length <= 2}>
                        <Trash2 size={16} className="text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" onClick={addEntryRow} className="mt-2">
                  <Plus size={14} className="mr-2" /> Ajouter une ligne
                </Button>
              </div>

              <div className="flex justify-end border-t pt-4">
                <div className="space-y-1 text-right">
                  <div className="flex justify-end gap-8 text-sm">
                    <span>Total Débit: <strong>{totalDebit.toLocaleString()}</strong></span>
                    <span>Total Crédit: <strong>{totalCredit.toLocaleString()}</strong></span>
                  </div>
                  {!isBalanced && totalDebit > 0 && (
                    <p className="text-xs text-rose-500 font-medium">L'écriture n'est pas équilibrée (Écart: {Math.abs(totalDebit - totalCredit).toLocaleString()})</p>
                  )}
                  {isBalanced && (
                    <p className="text-xs text-emerald-500 font-medium">Écriture équilibrée</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveTransaction} disabled={!isBalanced || loading}>
                {loading ? "Enregistrement..." : "Valider l'écriture"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Journal des opérations</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Filter size={14} /> Filtrer
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Search size={14} /> Rechercher
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 p-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-background">
                        {format(new Date(tx.date), 'dd MMM yyyy', { locale: fr })}
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {tx.journalCode || 'OD'}
                      </Badge>
                      <span className="font-semibold">{tx.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">REF: {tx.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="w-[120px]">Compte</TableHead>
                        <TableHead>Libellé Compte</TableHead>
                        <TableHead className="text-right w-[150px]">Débit</TableHead>
                        <TableHead className="text-right w-[150px]">Crédit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tx.entries?.map((entry: any, i: number) => {
                        const account = accounts.find(a => a.id === entry.accountId);
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{account?.code || '???'}</TableCell>
                            <TableCell className="text-sm">{account?.name || 'Compte inconnu'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowRightLeft size={48} className="mx-auto mb-4 opacity-20" />
                <p>Aucune transaction enregistrée pour le moment.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
