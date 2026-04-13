import { useEffect, useState } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
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
import { Calculator, Download, Filter, RefreshCw } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Badge } from '@/components/ui/badge';

interface AccountBalance {
  id: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

import { downloadPDF } from '../lib/download-utils';

export default function Balance() {
  const { userData, company } = useAuth();
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExportPDF = () => {
    const headers = [['N° Compte', 'Intitulé', 'Débit', 'Crédit', 'Solde Débiteur', 'Solde Créditeur']];
    const data = balances.map(b => [
      b.code,
      b.name,
      b.debit.toLocaleString(),
      b.credit.toLocaleString(),
      b.balance > 0 ? b.balance.toLocaleString() : '-',
      b.balance < 0 ? Math.abs(b.balance).toLocaleString() : '-'
    ]);
    
    // Add totals row
    const totalD = balances.reduce((sum, b) => sum + b.debit, 0);
    const totalC = balances.reduce((sum, b) => sum + b.credit, 0);
    const totalSD = balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0);
    const totalSC = balances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0);
    
    data.push(['TOTAUX', '', totalD.toLocaleString(), totalC.toLocaleString(), totalSD.toLocaleString(), totalSC.toLocaleString()]);
    
    downloadPDF(`Balance Générale - ${company?.name}`, headers, data, `Balance_${new Date().getFullYear()}`);
  };

  const fetchBalances = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      // 1. Fetch all accounts
      const accountsSnap = await getDocs(query(collection(db, `companies/${userData.companyId}/accounts`)));
      const accounts = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch all journal entries
      const entriesSnap = await getDocs(query(collection(db, `companies/${userData.companyId}/journal_entries`)));
      const entries = entriesSnap.docs.map(doc => doc.data());

      // 3. Calculate balances
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
  }, [userData]);

  const totalDebit = balances.reduce((sum, b) => sum + b.debit, 0);
  const totalCredit = balances.reduce((sum, b) => sum + b.credit, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Balance des Comptes</h1>
          <p className="text-muted-foreground">Récapitulatif des mouvements et soldes de tous les comptes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBalances} disabled={loading}>
            <RefreshCw size={18} className={cn("mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button className="gap-2" onClick={handleExportPDF}>
            <Download size={18} />
            Exporter PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Balance Générale</CardTitle>
              <CardDescription>Période: Exercice en cours</CardDescription>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Total Débit</span>
                <span className="font-bold">{totalDebit.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Total Crédit</span>
                <span className="font-bold">{totalCredit.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">N° Compte</TableHead>
                <TableHead>Intitulé du compte</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead className="text-right">Solde Débiteur</TableHead>
                <TableHead className="text-right">Solde Créditeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.length > 0 ? (
                balances.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono font-bold">{b.code}</TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell className="text-right font-mono">{b.debit > 0 ? b.debit.toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right font-mono">{b.credit > 0 ? b.credit.toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">
                      {b.balance > 0 ? b.balance.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-rose-600">
                      {b.balance < 0 ? Math.abs(b.balance).toLocaleString() : '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {loading ? "Calcul en cours..." : "Aucune donnée disponible."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {balances.length > 0 && (
              <tfoot className="bg-muted/50 font-bold">
                <TableRow>
                  <TableCell colSpan={2}>TOTAUX</TableCell>
                  <TableCell className="text-right font-mono">{totalDebit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{totalCredit.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">
                    {balances.filter(b => b.balance > 0).reduce((sum, b) => sum + b.balance, 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {balances.filter(b => b.balance < 0).reduce((sum, b) => sum + Math.abs(b.balance), 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

import { cn } from '@/lib/utils';
