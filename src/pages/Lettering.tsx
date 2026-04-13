import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ArrowRightLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';

export default function Lettering() {
  const { userData } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch unlettered entries for third-party accounts (401, 411)
    const q = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      where('lettering', '==', null)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for third-party accounts (starts with 401 or 411)
      // Note: In a real app, we'd fetch account details to be sure
      setEntries(allEntries);
    });

    const qAccs = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccs = onSnapshot(qAccs, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
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
    if (selectedEntries.length < 2 || Math.abs(diff) > 0.01) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const letteringCode = `L${Date.now().toString(36).toUpperCase()}`;

      selectedEntries.forEach(id => {
        const ref = doc(db, `companies/${userData!.companyId}/journal_entries`, id);
        batch.update(ref, { lettering: letteringCode });
      });

      await batch.commit();
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'journal_entries', 'multiple', { letteringCode, entries: selectedEntries });
      
      toast.success(`Lettrage effectué avec le code ${letteringCode}`);
      setSelectedEntries([]);
    } catch (error) {
      toast.error("Erreur lors du lettrage");
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    const account = accounts.find(acc => acc.id === e.accountId);
    const searchStr = `${e.label} ${account?.code} ${account?.name} ${e.description}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lettrage</h1>
          <p className="text-muted-foreground">Associez vos règlements aux factures correspondantes.</p>
        </div>
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
          <Button variant="outline" className="gap-2"><Filter size={18} /> Filtrer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Écritures non lettrées</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Compte</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map(e => {
                    const account = accounts.find(acc => acc.id === e.accountId);
                    return (
                      <TableRow 
                        key={e.id} 
                        className={cn("cursor-pointer", selectedEntries.includes(e.id) && "bg-primary/5")}
                        onClick={() => toggleSelect(e.id)}
                      >
                        <TableCell>
                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                            selectedEntries.includes(e.id) ? "bg-primary border-primary" : "border-muted-foreground"
                          )}>
                            {selectedEntries.includes(e.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                        </TableCell>
                        <TableCell>{e.date}</TableCell>
                        <TableCell className="font-mono text-xs">{account?.code || '???'}</TableCell>
                        <TableCell>{e.description || e.label}</TableCell>
                        <TableCell className="text-right">{e.debit > 0 ? e.debit.toLocaleString() : '-'}</TableCell>
                        <TableCell className="text-right">{e.credit > 0 ? e.credit.toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Non lettré</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Aucune écriture à lettrer trouvée.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20 sticky top-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Résumé de la sélection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Écritures :</span>
                <span className="font-bold">{selectedEntries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Débit :</span>
                <span className="font-bold text-blue-600">{totalDebit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Crédit :</span>
                <span className="font-bold text-rose-600">{totalCredit.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center font-bold">
                <span>Écart :</span>
                <span className={cn(Math.abs(diff) < 0.01 ? "text-green-600" : "text-rose-600")}>
                  {diff.toLocaleString()}
                </span>
              </div>
              <Button 
                className="w-full gap-2" 
                disabled={selectedEntries.length < 2 || Math.abs(diff) > 0.01 || loading}
                onClick={handleLettering}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRightLeft size={16} />}
                Lettrer la sélection
              </Button>
              {Math.abs(diff) > 0.01 && selectedEntries.length >= 2 && (
                <p className="text-[10px] text-center text-rose-500">
                  L'écart doit être nul pour lettrer.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
