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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Download, FileSpreadsheet, FileText, Printer, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { downloadPDF } from '../lib/download-utils';

export default function Reports() {
  const { userData, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>({
    assets: [],
    liabilities: [],
    equity: [],
    revenue: [],
    expenses: []
  });

  const handleExportPDF = () => {
    const headers = [['Code', 'Compte', 'Solde']];
    const data = [
      ...reportData.assets.map((a: any) => [a.code, a.name, a.balance.toLocaleString()]),
      ...reportData.liabilities.map((l: any) => [l.code, l.name, l.balance.toLocaleString()]),
      ...reportData.equity.map((e: any) => [e.code, e.name, e.balance.toLocaleString()]),
      ...reportData.revenue.map((r: any) => [r.code, r.name, r.balance.toLocaleString()]),
      ...reportData.expenses.map((ex: any) => [ex.code, ex.name, ex.balance.toLocaleString()])
    ];
    downloadPDF(`Rapport Financier - ${company?.name}`, headers, data, `Rapport_Financier_${new Date().getFullYear()}`);
  };

  useEffect(() => {
    if (!userData?.companyId) return;
    fetchReportData();
  }, [userData]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch all accounts
      const accsPath = `companies/${userData.companyId}/accounts`;
      const accsSnap = await getDocs(collection(db, accsPath));
      const accounts = accsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all journal entries
      const entriesPath = `companies/${userData.companyId}/journal_entries`;
      const entriesSnap = await getDocs(collection(db, entriesPath));
      const entries = entriesSnap.docs.map(doc => doc.data());

      // Calculate balances
      const data: any = { assets: [], liabilities: [], equity: [], revenue: [], expenses: [] };
      
      accounts.forEach((acc: any) => {
        const accEntries = entries.filter(e => e.accountId === acc.id);
        const debit = accEntries.reduce((sum, e) => sum + e.debit, 0);
        const credit = accEntries.reduce((sum, e) => sum + e.credit, 0);
        const balance = acc.type === 'asset' || acc.type === 'expense' ? debit - credit : credit - debit;
        
        if (balance !== 0) {
          data[acc.type + 's' as keyof typeof data].push({ ...acc, balance });
        }
      });

      setReportData(data);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}`);
      toast.error("Erreur lors de la génération du rapport : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (title: string, data: any[]) => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      Code: item.code,
      Compte: item.name,
      Solde: item.balance
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport");
    XLSX.writeFile(wb, `${title}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const calculateTotal = (items: any[]) => items.reduce((sum, i) => sum + i.balance, 0);

  const ReportSection = ({ title, items }: { title: string, items: any[] }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="font-bold text-lg">{calculateTotal(items).toLocaleString()} {company?.currency}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Compte</TableHead>
            <TableHead className="text-right">Solde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell className="text-right font-mono">{item.balance.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapports Financiers</h1>
          <p className="text-muted-foreground">Analysez la santé financière de votre entreprise.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
            <Download size={18} /> PDF
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => exportToExcel('Rapport_Financier', [...reportData.assets, ...reportData.liabilities])}>
            <FileSpreadsheet size={18} /> Excel
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer size={18} /> Imprimer
          </Button>
        </div>
      </div>

      <Tabs defaultValue="balance_sheet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="balance_sheet">Bilan (Balance Sheet)</TabsTrigger>
          <TabsTrigger value="pl">Compte de Résultat (P&L)</TabsTrigger>
          <TabsTrigger value="trial_balance">Balance Générale</TabsTrigger>
        </TabsList>

        <TabsContent value="balance_sheet">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Actif (Assets)</CardTitle>
                <CardDescription>Ce que l'entreprise possède.</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportSection title="Total Actif" items={reportData.assets} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Passif & Capitaux Propres</CardTitle>
                <CardDescription>Ce que l'entreprise doit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <ReportSection title="Total Passif" items={reportData.liabilities} />
                <ReportSection title="Capitaux Propres" items={reportData.equity} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produits & Charges</CardTitle>
                  <CardDescription>Analyse de la rentabilité sur la période.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Résultat Net</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    calculateTotal(reportData.revenue) - calculateTotal(reportData.expenses) >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {(calculateTotal(reportData.revenue) - calculateTotal(reportData.expenses)).toLocaleString()} {company?.currency}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <ReportSection title="Total Produits (Revenue)" items={reportData.revenue} />
              <ReportSection title="Total Charges (Expenses)" items={reportData.expenses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial_balance">
          <Card>
            <CardHeader>
              <CardTitle>Balance des Comptes</CardTitle>
              <CardDescription>Vue d'ensemble de tous les soldes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...reportData.assets, ...reportData.liabilities, ...reportData.equity, ...reportData.revenue, ...reportData.expenses]
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right font-mono">-</TableCell>
                      <TableCell className="text-right font-mono">-</TableCell>
                      <TableCell className="text-right font-mono font-bold">{item.balance.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
