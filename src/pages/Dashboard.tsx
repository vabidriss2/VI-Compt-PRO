import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
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
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie,
  Cell
} from 'recharts';
import { getFinancialInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Dashboard() {
  const { userData, company } = useAuth();
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    receivables: 0,
    payables: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch Invoices for stats
    const qInvoices = query(collection(db, `companies/${userData.companyId}/invoices`));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invs = snapshot.docs.map(doc => doc.data());
      const revenue = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const expenses = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const receivables = invs.filter((i: any) => i.type === 'sale' && i.status !== 'paid').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const payables = invs.filter((i: any) => i.type === 'purchase' && i.status !== 'paid').reduce((sum, i: any) => sum + i.totalAmount, 0);
      
      setStats({
        revenue,
        expenses,
        profit: revenue - expenses,
        receivables,
        payables
      });
    });

    const qTxs = query(
      collection(db, `companies/${userData.companyId}/transactions`),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribeTxs = onSnapshot(qTxs, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeTxs();
    };
  }, [userData]);

  // Mock data for charts
  const monthlyData = [
    { name: 'Jan', revenue: stats.revenue * 0.1, expenses: stats.expenses * 0.1 },
    { name: 'Fév', revenue: stats.revenue * 0.15, expenses: stats.expenses * 0.12 },
    { name: 'Mar', revenue: stats.revenue * 0.2, expenses: stats.expenses * 0.18 },
    { name: 'Avr', revenue: stats.revenue * 0.18, expenses: stats.expenses * 0.22 },
    { name: 'Mai', revenue: stats.revenue * 0.22, expenses: stats.expenses * 0.15 },
    { name: 'Juin', revenue: stats.revenue * 0.15, expenses: stats.expenses * 0.23 },
  ];

  const expenseDistribution = [
    { name: 'Opérations', value: stats.expenses * 0.6 },
    { name: 'Taxes', value: stats.expenses * 0.2 },
    { name: 'Autres', value: stats.expenses * 0.2 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const generateInsights = async () => {
    setLoadingInsights(true);
    const insights = await getFinancialInsights({
      monthlyData,
      stats,
      companyName: company?.name
    });
    setAiInsights(insights);
    setLoadingInsights(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur VI Compt PRO. Voici l'état de vos finances.</p>
        </div>
        <Button onClick={generateInsights} disabled={loadingInsights} className="gap-2">
          <Sparkles size={18} />
          {loadingInsights ? "Analyse en cours..." : "Générer des insights IA"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.revenue.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <span className="text-emerald-500 flex items-center"><ArrowUpRight size={12} /> +12%</span> par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expenses.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <span className="text-rose-500 flex items-center"><ArrowDownRight size={12} /> +4%</span> par rapport au mois dernier
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créances Clients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.receivables.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Factures de vente impayées
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dettes Fournisseurs</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payables.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Factures d'achat à régler
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Main Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Revenus vs Dépenses</CardTitle>
            <CardDescription>Évolution sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenus" />
                  <Bar dataKey="expenses" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Dépenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              Analyses IA
            </CardTitle>
            <CardDescription>Insights financiers générés par Gemini</CardDescription>
          </CardHeader>
          <CardContent>
            {aiInsights ? (
              <div className="prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto pr-2">
                <ReactMarkdown>{aiInsights}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-center space-y-4">
                <div className="p-4 bg-primary/5 rounded-full">
                  <Sparkles className="h-12 w-12 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur le bouton en haut pour analyser vos données financières avec l'IA.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Transactions */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Transactions Récentes</CardTitle>
            <CardDescription>Les 5 dernières opérations enregistrées</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-full text-primary">
                        <DollarSign size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{tx.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={12} /> {new Date(tx.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={tx.type === 'revenue' ? 'default' : 'secondary'}>
                        {tx.reference}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune transaction récente.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Répartition des Dépenses</CardTitle>
            <CardDescription>Par catégorie ce mois-ci</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {expenseDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
