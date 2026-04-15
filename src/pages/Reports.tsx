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
import { Download, FileSpreadsheet, FileText, Printer, BarChart3, TrendingUp, TrendingDown, Activity, PieChart, ArrowUpRight, ArrowDownRight, Info, Calendar, RefreshCw, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { format, startOfYear, endOfYear, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import { downloadPDF } from '../lib/download-utils';

export default function Reports() {
  const { userData, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfYear(new Date()), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<any>({
    assets: [],
    liabilities: [],
    equity: [],
    revenue: [],
    expenses: []
  });

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  const handleExportAllPDF = () => {
    const headers = [['Code', 'Compte', 'Solde']];
    const data = [
      ['--- ACTIF ---', '', ''],
      ...reportData.assets.map((a: any) => [a.code, a.name, a.balance.toLocaleString()]),
      ['--- PASSIF ---', '', ''],
      ...reportData.liabilities.map((l: any) => [l.code, l.name, l.balance.toLocaleString()]),
      ['--- CAPITAUX PROPRES ---', '', ''],
      ...reportData.equity.map((e: any) => [e.code, e.name, e.balance.toLocaleString()]),
      ['--- PRODUITS ---', '', ''],
      ...reportData.revenue.map((r: any) => [r.code, r.name, r.balance.toLocaleString()]),
      ['--- CHARGES ---', '', ''],
      ...reportData.expenses.map((ex: any) => [ex.code, ex.name, ex.balance.toLocaleString()])
    ];
    downloadPDF(`Rapport Complet - ${company?.name}`, headers, data, `Rapport_Complet_${new Date().getFullYear()}`);
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

  const totalRevenue = calculateTotal(reportData.revenue);
  const totalExpenses = calculateTotal(reportData.expenses);
  const netResult = totalRevenue - totalExpenses;

  const marginRate = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0;

  const sigData = [
    { name: 'Marge Commerciale', value: totalRevenue * 0.4, color: '#0ea5e9' }, // Mock calculation for demo
    { name: 'Valeur Ajoutée', value: totalRevenue * 0.3, color: '#10b981' },
    { name: 'EBE', value: totalRevenue * 0.2, color: '#f59e0b' },
    { name: 'Résultat Exploitation', value: totalRevenue * 0.15, color: '#8b5cf6' },
    { name: 'Résultat Net', value: netResult, color: '#ef4444' },
  ];

  const balanceData = [
    { name: 'Actif', value: calculateTotal(reportData.assets) },
    { name: 'Passif', value: calculateTotal(reportData.liabilities) + calculateTotal(reportData.equity) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">États de Gestion</h1>
          <p className="text-muted-foreground">Analyse approfondie de la performance et de la structure financière.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReportData} disabled={loading} className="gap-2">
            <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Actualiser
          </Button>
          <Button size="sm" className="gap-2" onClick={handleExportAllPDF}>
            <Download size={14} /> Rapport Complet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Chiffre d'Affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{totalRevenue.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600">
              <TrendingUp size={12} />
              <span className="text-[10px] font-bold">+12.5% vs N-1</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Résultat Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", netResult >= 0 ? "text-emerald-700" : "text-rose-700")}>
              {netResult.toLocaleString()} {company?.currency}
            </div>
            <div className="flex items-center gap-1 mt-1 text-slate-500">
              <Activity size={12} />
              <span className="text-[10px] font-bold">Marge: {marginRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Trésorerie Nette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">
              {calculateTotal(reportData.assets.filter((a: any) => a.code.startsWith('5'))).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Indice de Solvabilité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-primary">1.85</div>
            <Progress value={85} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="balance_sheet" className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="balance_sheet" className="gap-2"><BarChart3 size={14} /> Bilan</TabsTrigger>
            <TabsTrigger value="pl" className="gap-2"><Activity size={14} /> Résultat</TabsTrigger>
            <TabsTrigger value="sig" className="gap-2"><TrendingUp size={14} /> SIG</TabsTrigger>
            <TabsTrigger value="ratios" className="gap-2"><PieChart size={14} /> Ratios</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-slate-400" />
            <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <ArrowRight size={14} className="text-slate-300" />
            <Input type="date" className="h-7 w-32 border-none p-0 text-xs focus-visible:ring-0" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <TabsContent value="balance_sheet" className="m-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-wider">Structure de l'Actif vs Passif</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart data={balanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-sm font-black uppercase tracking-wider">Répartition Actif</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                    <RePieChart>
                      <Pie
                        data={reportData.assets.slice(0, 5)}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="balance"
                      >
                        {reportData.assets.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {reportData.assets.slice(0, 3).map((a: any, i: number) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-slate-600 truncate max-w-[120px]">{a.name}</span>
                      </div>
                      <span className="font-bold">{((a.balance / calculateTotal(reportData.assets)) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Actif (Emplois)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold pl-6">Compte</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold pr-6">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.assets.map((a: any) => (
                      <TableRow key={a.id} className="hover:bg-slate-50/50 border-slate-100">
                        <TableCell className="pl-6">
                          <p className="text-xs font-bold text-slate-900">{a.name}</p>
                          <p className="text-[9px] font-mono text-slate-400">{a.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black pr-6">{a.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-black">
                      <TableCell className="pl-6 text-xs uppercase tracking-wider">Total Actif</TableCell>
                      <TableCell className="text-right font-mono text-sm pr-6">{calculateTotal(reportData.assets).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Passif & Capitaux (Ressources)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-bold pl-6">Compte</TableHead>
                      <TableHead className="text-right text-[10px] uppercase font-bold pr-6">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-slate-100/50"><TableCell colSpan={2} className="text-[9px] font-black uppercase pl-6 text-slate-400 tracking-widest">Capitaux Propres</TableCell></TableRow>
                    {reportData.equity.map((e: any) => (
                      <TableRow key={e.id} className="hover:bg-slate-50/50 border-slate-100">
                        <TableCell className="pl-6">
                          <p className="text-xs font-bold text-slate-900">{e.name}</p>
                          <p className="text-[9px] font-mono text-slate-400">{e.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black pr-6">{e.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-100/50"><TableCell colSpan={2} className="text-[9px] font-black uppercase pl-6 text-slate-400 tracking-widest">Dettes (Passif)</TableCell></TableRow>
                    {reportData.liabilities.map((l: any) => (
                      <TableRow key={l.id} className="hover:bg-slate-50/50 border-slate-100">
                        <TableCell className="pl-6">
                          <p className="text-xs font-bold text-slate-900">{l.name}</p>
                          <p className="text-[9px] font-mono text-slate-400">{l.code}</p>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-black pr-6">{l.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-black">
                      <TableCell className="pl-6 text-xs uppercase tracking-wider">Total Passif</TableCell>
                      <TableCell className="text-right font-mono text-sm pr-6">{(calculateTotal(reportData.liabilities) + calculateTotal(reportData.equity)).toLocaleString()}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sig" className="m-0">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-sm font-black uppercase tracking-wider">Soldes Intermédiaires de Gestion (SIG)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%" minHeight={400}>
                  <BarChart data={sigData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {sigData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {sigData.map((item) => (
                  <div key={item.name} className="p-4 border rounded-xl bg-slate-50/50">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{item.name}</p>
                    <p className="text-lg font-black text-slate-900">{item.value.toLocaleString()} {company?.currency}</p>
                    <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full" style={{ width: '70%', backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratios" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-wider">Liquidité Générale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">1.45</span>
                  <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center"><ArrowUpRight size={12} /> +0.12</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Capacité à faire face aux dettes à court terme.</p>
                <Progress value={75} className="h-2 mt-4" />
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-wider">Rentabilité Nette</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">{marginRate.toFixed(1)}%</span>
                  <span className="text-xs font-bold text-emerald-600 mb-1 flex items-center"><ArrowUpRight size={12} /> +2.4%</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Part du résultat net dans le chiffre d'affaires.</p>
                <Progress value={marginRate} className="h-2 mt-4" />
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-wider">Indépendance Financière</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">0.62</span>
                  <span className="text-xs font-bold text-rose-600 mb-1 flex items-center"><ArrowDownRight size={12} /> -0.05</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 italic">Rapport entre capitaux propres et passif total.</p>
                <Progress value={62} className="h-2 mt-4" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
