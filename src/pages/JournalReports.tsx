import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs, where } from 'firebase/firestore';
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Printer, Download, Filter, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Badge } from '@/components/ui/badge';

import { downloadPDF } from '../lib/download-utils';

export default function JournalReports() {
  const { userData, company } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [selectedJournal, setSelectedJournal] = useState('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExportPDF = () => {
    const headers = [['Date', 'Journal', 'Référence', 'Libellé', 'Débit', 'Crédit']];
    const data: any[] = [];
    
    transactions.forEach(tx => {
      tx.entries.forEach((entry: any, i: number) => {
        const account = accounts.find(a => a.id === entry.accountId);
        data.push([
          i === 0 ? format(new Date(tx.date), 'dd/MM/yyyy') : '',
          i === 0 ? (journals.find(j => j.id === tx.journalId)?.code || 'JRN') : '',
          i === 0 ? (tx.reference || tx.id.slice(0, 8).toUpperCase()) : '',
          entry.description || account?.name || '',
          entry.debit > 0 ? entry.debit.toLocaleString() : '-',
          entry.credit > 0 ? entry.credit.toLocaleString() : '-'
        ]);
      });
    });
    
    downloadPDF(`Journaux Comptables - ${company?.name}`, headers, data, `Journaux_${new Date().getFullYear()}`);
  };

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch Journals
    const unsubscribeJournals = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/journals`)),
      (snapshot) => setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`)
    );

    // Fetch Accounts
    const unsubscribeAccs = onSnapshot(
      query(collection(db, `companies/${userData.companyId}/accounts`)),
      (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`)
    );

    return () => {
      unsubscribeJournals();
      unsubscribeAccs();
    };
  }, [userData]);

  useEffect(() => {
    if (!userData?.companyId) return;
    fetchTransactions();
  }, [userData, selectedJournal]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, `companies/${userData!.companyId}/transactions`),
        orderBy('date', 'desc')
      );

      if (selectedJournal !== 'all') {
        q = query(q, where('journalId', '==', selectedJournal));
      }

      const snapshot = await getDocs(q);
      const txs = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const txData = docSnap.data();
        const qEntries = query(
          collection(db, `companies/${userData!.companyId}/journal_entries`),
          where('transactionId', '==', docSnap.id)
        );
        const entriesSnap = await getDocs(qEntries);
        const entries = entriesSnap.docs.map(e => e.data());
        return { id: docSnap.id, ...txData, entries };
      }));
      setTransactions(txs);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journaux Comptables</h1>
          <p className="text-muted-foreground">Consultation chronologique des écritures par journal.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Printer size={18} /> Imprimer
          </Button>
          <Button className="gap-2" onClick={handleExportPDF}>
            <Download size={18} /> Exporter
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="text-primary" size={20} />
              Filtres d'affichage
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Journal:</span>
                <Select value={selectedJournal} onValueChange={setSelectedJournal}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Tous les journaux" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les journaux</SelectItem>
                    {journals.map(j => (
                      <SelectItem key={j.id} value={j.id}>{j.code} - {j.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                        {format(new Date(tx.date), 'dd/MM/yyyy', { locale: fr })}
                      </Badge>
                      <span className="font-semibold">{tx.description}</span>
                      <Badge variant="secondary">
                        {journals.find(j => j.id === tx.journalId)?.code || 'JRN'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">REF: {tx.reference || tx.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="w-[120px]">Compte</TableHead>
                        <TableHead>Libellé</TableHead>
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
                            <TableCell className="text-sm">{entry.description || account?.name}</TableCell>
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
                <p>{loading ? "Chargement..." : "Aucune écriture trouvée pour ce journal."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
