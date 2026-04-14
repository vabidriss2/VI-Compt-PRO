import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Landmark, Upload, CheckCircle2, AlertCircle, Search, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function BankRecon() {
  const { userData, company } = useAuth();
  const [bankEntries, setBankEntries] = useState<any[]>([]);
  const [statementLines, setStatementLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch journal entries for bank accounts (starts with 512)
    const qEntries = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      where('reconciled', '==', null)
    );

    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // In a real app, we'd filter by account code 512*
      setBankEntries(all);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journal_entries`);
    });

    // Fetch bank statement lines
    const qStatements = query(
      collection(db, `companies/${userData.companyId}/bank_statements`),
      where('reconciled', '==', null)
    );

    const unsubscribeStatements = onSnapshot(qStatements, (snapshot) => {
      setStatementLines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/bank_statements`);
    });

    return () => {
      unsubscribeEntries();
      unsubscribeStatements();
    };
  }, [userData]);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      // Simulate importing a bank statement
      const mockLines = [
        { date: '2024-03-12', label: 'VIREMENT RECU CLIENT X', amount: 1200, type: 'credit', reconciled: null },
        { date: '2024-03-14', label: 'PRLV ORANGE', amount: -45.90, type: 'debit', reconciled: null },
        { date: '2024-03-15', label: 'ACHAT CARREFOUR', amount: -82.30, type: 'debit', reconciled: null },
      ];

      const batch = writeBatch(db);
      mockLines.forEach(line => {
        const ref = doc(collection(db, `companies/${userData!.companyId}/bank_statements`));
        batch.set(ref, { ...line, companyId: userData!.companyId, createdAt: serverTimestamp() });
      });

      await batch.commit();
      toast.success("Relevé importé avec succès (Simulation)");
    } catch (error) {
      toast.error("Erreur lors de l'importation");
    } finally {
      setIsImporting(false);
    }
  };

  const handleAutoReconcile = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let matchedCount = 0;

      // Simple matching logic: same amount and close date (simulated)
      for (const line of statementLines) {
        const match = bankEntries.find(e => 
          Math.abs((e.debit || -e.credit) - line.amount) < 0.01
        );

        if (match) {
          const reconId = `REC-${Date.now().toString(36).toUpperCase()}-${matchedCount}`;
          batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, match.id), { reconciled: reconId });
          batch.update(doc(db, `companies/${userData!.companyId}/bank_statements`, line.id), { reconciled: reconId });
          matchedCount++;
        }
      }

      if (matchedCount > 0) {
        await batch.commit();
        await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'bank_reconciliation', 'auto', { matchedCount });
        toast.success(`${matchedCount} écritures rapprochées automatiquement !`);
      } else {
        toast.info("Aucune correspondance exacte trouvée.");
      }
    } catch (error) {
      toast.error("Erreur lors du rapprochement");
    } finally {
      setLoading(false);
    }
  };

  const bankBalance = bankEntries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
  const statementBalance = statementLines.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapprochement Bancaire</h1>
          <p className="text-muted-foreground">Faites correspondre vos relevés bancaires avec votre comptabilité.</p>
        </div>
        <Button className="gap-2" onClick={handleImport} disabled={isImporting}>
          {isImporting ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
          Importer un relevé
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde Comptable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankBalance.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde Bancaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statementBalance.toLocaleString()} {company?.currency}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Écart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", Math.abs(bankBalance - statementBalance) < 0.01 ? "text-green-500" : "text-rose-500")}>
              {(bankBalance - statementBalance).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lignes à traiter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{statementLines.length + bankEntries.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="to-reconcile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="to-reconcile">À rapprocher</TabsTrigger>
          <TabsTrigger value="reconciled">Rapprochés</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="to-reconcile" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Landmark size={16} /> Relevé Bancaire ({statementLines.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statementLines.map(line => (
                      <TableRow key={line.id} className="cursor-pointer hover:bg-accent">
                        <TableCell>{line.date}</TableCell>
                        <TableCell>{line.label}</TableCell>
                        <TableCell className={cn("text-right font-bold", line.amount > 0 ? "text-green-600" : "text-rose-600")}>
                          {line.amount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {statementLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                          Aucune ligne de relevé à traiter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> Écritures Comptables ({bankEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankEntries.map(entry => (
                      <TableRow key={entry.id} className="cursor-pointer hover:bg-accent">
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.description || entry.label}</TableCell>
                        <TableCell className={cn("text-right font-bold", entry.debit > 0 ? "text-green-600" : "text-rose-600")}>
                          {(entry.debit || -entry.credit).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {bankEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                          Aucune écriture comptable à traiter.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-center">
            <Button 
              className="gap-2 px-8" 
              onClick={handleAutoReconcile} 
              disabled={loading || (statementLines.length === 0 && bankEntries.length === 0)}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Valider le rapprochement automatique
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
