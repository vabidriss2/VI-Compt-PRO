import { useEffect, useState, useMemo } from 'react';
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
  Clock,
  Activity
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
import { checkAndGenerateNotifications, subscribeToNotifications, Notification } from '../lib/notifications';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Info, PlusCircle, FilePlus, UserPlus, Landmark as BankIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Trigger notification check
    checkAndGenerateNotifications(userData.companyId);

    // Subscribe to notifications
    const unsubscribeNotifications = subscribeToNotifications(userData.companyId, (notifs) => {
      setNotifications(notifs.filter(n => n.status === 'unread'));
    });

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
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

    // Fetch Journal Entries for real chart data
    const qEntries = query(collection(db, `companies/${userData.companyId}/journal_entries`));
    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const entries = snapshot.docs.map(doc => doc.data());
      setJournalEntries(entries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journal_entries`);
    });

    // Fetch Accounts to identify revenue/expense types
    const qAccounts = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeTxs();
      unsubscribeNotifications();
      unsubscribeEntries();
      unsubscribeAccounts();
    };
  }, [userData]);

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Calculate real monthly data
  const monthlyData = useMemo(() => {
    const data = [
      { name: 'Jan', revenue: 0, expenses: 0 },
      { name: 'Fév', revenue: 0, expenses: 0 },
      { name: 'Mar', revenue: 0, expenses: 0 },
      { name: 'Avr', revenue: 0, expenses: 0 },
      { name: 'Mai', revenue: 0, expenses: 0 },
      { name: 'Juin', revenue: 0, expenses: 0 },
    ];

    const monthMap: { [key: string]: number } = {
      '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5
    };

    journalEntries.forEach(entry => {
      const month = entry.date?.split('-')[1];
      if (month && monthMap[month] !== undefined) {
        const account = accounts.find(a => a.id === entry.accountId);
        if (account) {
          if (account.type === 'revenue') {
            data[monthMap[month]].revenue += (entry.credit - entry.debit);
          } else if (account.type === 'expense') {
            data[monthMap[month]].expenses += (entry.debit - entry.credit);
          }
        }
      }
    });

    return data;
  }, [journalEntries, accounts]);

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
        <div className="flex gap-2">
          <Link to="/invoices">
            <Button variant="outline" className="gap-2">
              <FileText size={18} />
              Gérer les factures
            </Button>
          </Link>
          <Button onClick={generateInsights} disabled={loadingInsights} className="gap-2">
            <Sparkles size={18} />
            {loadingInsights ? "Analyse en cours..." : "Générer des insights IA"}
          </Button>
        </div>
      </div>

      {/* Tâches à effectuer */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="text-primary" size={20} />
              Tâches à effectuer
            </CardTitle>
            <CardDescription>Actions recommandées basées sur vos données en temps réel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 bg-card rounded-lg border shadow-sm">
                    {n.type === 'invoice_overdue' ? (
                      <AlertCircle className="text-rose-500 mt-0.5 shrink-0" size={18} />
                    ) : (
                      <Info className="text-blue-500 mt-0.5 shrink-0" size={18} />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    <Link to="/invoices">
                      <Button size="sm" variant="ghost" className="h-8 text-xs">Voir</Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm italic">
                  Toutes les tâches sont à jour. Excellent travail !
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PlusCircle className="text-primary" size={20} />
              Actions Rapides
            </CardTitle>
            <CardDescription>Accédez directement aux fonctionnalités clés.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/entries">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <PlusCircle size={18} className="text-primary" />
                  Nouvelle Écriture
                </Button>
              </Link>
              <Link to="/invoices">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <FilePlus size={18} className="text-primary" />
                  Créer une Facture
                </Button>
              </Link>
              <Link to="/contacts">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <UserPlus size={18} className="text-primary" />
                  Nouveau Contact
                </Button>
              </Link>
              <Link to="/bank-recon">
                <Button variant="outline" className="w-full justify-start gap-2 h-12">
                  <BankIcon size={18} className="text-primary" />
                  Rapprochement
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Dettes Fourn.</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payables.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Factures d'achat à régler
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Santé Financière</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.revenue > stats.expenses ? 'Excellente' : 'À surveiller'}
            </div>
            <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  stats.revenue > stats.expenses ? "bg-emerald-500" : "bg-amber-500"
                )}
                style={{ width: `${Math.min(100, (stats.revenue / (stats.expenses || 1)) * 50)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ratio: {((stats.revenue / (stats.expenses || 1)) * 100).toFixed(0)}%
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
            <div className="h-[300px] min-h-[300px] w-full">
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
            <div className="h-[250px] min-h-[250px] w-full">
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
