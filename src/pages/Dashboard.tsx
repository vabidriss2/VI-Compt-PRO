import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy, getDocs } from 'firebase/firestore';
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
  Activity,
  Landmark,
  PieChart as PieChartIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Info,
  PlusCircle,
  FilePlus,
  UserPlus,
  Landmark as BankIcon
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
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { getFinancialInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { checkAndGenerateNotifications, subscribeToNotifications, Notification } from '../lib/notifications';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Dashboard() {
  const { userData, company } = useAuth();
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    receivables: 0,
    payables: 0,
    vatCollected: 0,
    vatDeductible: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!userData?.companyId) return;

    checkAndGenerateNotifications(userData.companyId);

    const unsubscribeNotifications = subscribeToNotifications(userData.companyId, (notifs) => {
      setNotifications(notifs.filter(n => n.status === 'unread'));
    });

    const qInvoices = query(collection(db, `companies/${userData.companyId}/invoices`));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invs = snapshot.docs.map(doc => doc.data());
      const revenue = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const expenses = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const receivables = invs.filter((i: any) => i.type === 'sale' && i.status !== 'paid').reduce((sum, i: any) => sum + i.totalAmount, 0);
      const payables = invs.filter((i: any) => i.type === 'purchase' && i.status !== 'paid').reduce((sum, i: any) => sum + i.totalAmount, 0);
      
      // VAT Estimation (assuming 20%)
      const vatCollected = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + (i.totalAmount * 0.2), 0);
      const vatDeductible = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + (i.totalAmount * 0.2), 0);

      setStats({
        revenue,
        expenses,
        profit: revenue - expenses,
        receivables,
        payables,
        vatCollected,
        vatDeductible
      });

      // Top Clients logic
      const clientMap: { [key: string]: { name: string, total: number } } = {};
      invs.filter((i: any) => i.type === 'sale').forEach((i: any) => {
        if (!clientMap[i.contactId]) {
          clientMap[i.contactId] = { name: i.contactName || 'Client Inconnu', total: 0 };
        }
        clientMap[i.contactId].total += i.totalAmount;
      });
      const sortedClients = Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 5);
      setTopClients(sortedClients);

    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
    });

    const qTxs = query(
      collection(db, `companies/${userData.companyId}/transactions`),
      orderBy('date', 'desc'),
      limit(5)
    );

    const unsubscribeTxs = onSnapshot(qTxs, (snapshot) => {
      setRecentTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/transactions`);
    });

    const qEntries = query(collection(db, `companies/${userData.companyId}/journal_entries`));
    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      setJournalEntries(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journal_entries`);
    });

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

  const monthlyData = useMemo(() => {
    const data = [
      { name: 'Jan', revenue: 0, expenses: 0, cash: 0 },
      { name: 'Fév', revenue: 0, expenses: 0, cash: 0 },
      { name: 'Mar', revenue: 0, expenses: 0, cash: 0 },
      { name: 'Avr', revenue: 0, expenses: 0, cash: 0 },
      { name: 'Mai', revenue: 0, expenses: 0, cash: 0 },
      { name: 'Juin', revenue: 0, expenses: 0, cash: 0 },
    ];

    const monthMap: { [key: string]: number } = { '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5 };

    journalEntries.forEach(entry => {
      const month = entry.date?.split('-')[1];
      if (month && monthMap[month] !== undefined) {
        const account = accounts.find(a => a.id === entry.accountId);
        if (account) {
          if (account.type === 'revenue') data[monthMap[month]].revenue += (entry.credit - entry.debit);
          else if (account.type === 'expense') data[monthMap[month]].expenses += (entry.debit - entry.credit);
          else if (account.accountId?.startsWith('5')) data[monthMap[month]].cash += (entry.debit - entry.credit);
        }
      }
    });

    return data;
  }, [journalEntries, accounts]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  const generateInsights = async () => {
    setLoadingInsights(true);
    const insights = await getFinancialInsights({ monthlyData, stats, companyName: company?.name });
    setAiInsights(insights);
    setLoadingInsights(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Pilotez votre activité avec des indicateurs en temps réel.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/entries">
            <Button variant="outline" className="gap-2">
              <PlusCircle size={18} /> Nouvelle Écriture
            </Button>
          </Link>
          <Button onClick={generateInsights} disabled={loadingInsights} className="gap-2 bg-primary text-primary-foreground">
            <Sparkles size={18} />
            {loadingInsights ? "Analyse..." : "Insights IA"}
          </Button>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Chiffre d'Affaires</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.revenue.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
              <ArrowUpRight size={12} /> +12.5% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400">Dépenses Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900 dark:text-rose-100">{stats.expenses.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 font-medium">
              <ArrowDownRight size={12} /> -2.1% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400">Trésorerie Nette</CardTitle>
            <Landmark className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.profit.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600 font-medium">
              <Activity size={12} /> Flux opérationnel positif
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400">Encours Clients</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.receivables.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 font-medium">
              <Clock size={12} /> {notifications.filter(n => n.type === 'invoice_overdue').length} factures en retard
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Financière</CardTitle>
                <CardDescription>Revenus vs Dépenses (6 derniers mois)</CardDescription>
              </div>
              <Badge variant="outline">Mensuel</Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[350px] pt-4 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 700}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 700}} 
                    dx={-10}
                  />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Revenus" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} name="Dépenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights & Notifications */}
        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="text-emerald-400" size={16} />
                Analyses Prédictives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiInsights ? (
                <div className="text-[11px] text-slate-300 leading-relaxed max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                  <ReactMarkdown>{aiInsights}</ReactMarkdown>
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <div className="p-3 bg-white/5 rounded-full w-fit mx-auto">
                    <Activity className="h-6 w-6 text-emerald-400/50" />
                  </div>
                  <p className="text-[10px] text-slate-400">Générez une analyse complète de vos flux avec l'IA.</p>
                  <Button variant="secondary" size="sm" onClick={generateInsights} className="h-7 text-[10px] font-bold">Lancer l'analyse</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} />
                Alertes & Tâches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 3).map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 border text-[11px]">
                    <div className={cn(
                      "h-2 w-2 rounded-full mt-1.5 shrink-0",
                      n.type === 'invoice_overdue' ? "bg-rose-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1">
                      <p className="font-bold">{n.title}</p>
                      <p className="text-muted-foreground line-clamp-1">{n.message}</p>
                    </div>
                    <Link to="/invoices">
                      <ArrowRight size={14} className="text-muted-foreground hover:text-primary transition-colors" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-[10px] text-muted-foreground italic">
                  Aucune alerte en attente.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Clients</CardTitle>
            <CardDescription className="text-[10px]">Par volume d'affaires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topClients.map((client, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold truncate max-w-[100px]">{client.name}</span>
                    <span className="text-[10px] text-muted-foreground">Client fidèle</span>
                  </div>
                </div>
                <span className="text-xs font-bold">{client.total.toLocaleString()} {company?.currency}</span>
              </div>
            ))}
            {topClients.length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Aucune donnée de vente.</p>}
          </CardContent>
        </Card>

        {/* Tax Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Synthèse TVA</CardTitle>
            <CardDescription className="text-[10px]">Estimation période en cours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">TVA Collectée</span>
                <span className="font-bold text-emerald-600">+{stats.vatCollected.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">TVA Déductible</span>
                <span className="font-bold text-rose-600">-{stats.vatDeductible.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-rose-500" style={{ width: `${(stats.vatDeductible / (stats.vatCollected || 1)) * 100}%` }} />
              </div>
            </div>
            <div className="pt-4 border-t flex justify-between items-center">
              <span className="text-xs font-bold">Solde à payer</span>
              <Badge variant={stats.vatCollected > stats.vatDeductible ? "destructive" : "default"}>
                {(stats.vatCollected - stats.vatDeductible).toLocaleString()} {company?.currency}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Dernières Opérations</CardTitle>
              <Link to="/entries" className="text-[10px] text-primary hover:underline">Voir tout</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-7 w-7 rounded flex items-center justify-center",
                      tx.type === 'revenue' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {tx.type === 'revenue' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-none">{tx.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(tx.date), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono">{tx.reference}</p>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase">{tx.journalId}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
