import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft,
  Wallet,
  Activity,
  BarChart3,
  Building2,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ArrowRight,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Tooltip as ShardcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { downloadPDF } from '../lib/download-utils';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function CashFlow() {
  const { userData, company } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.companyId) return;

    const qEntries = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      orderBy('date', 'asc')
    );

    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'journal_entries');
    });

    const qInvoices = query(
      collection(db, `companies/${userData.companyId}/invoices`),
      where('status', '!=', 'paid')
    );

    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    const qBanks = query(collection(db, `companies/${userData.companyId}/banks`));
    const unsubscribeBanks = onSnapshot(qBanks, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'banks');
    });

    return () => {
      unsubscribeEntries();
      unsubscribeInvoices();
      unsubscribeBanks();
    };
  }, [userData]);

  // Calculations
  const currentBalance = entries.reduce((sum, entry) => {
    // Bank accounts usually start with 512
    if (entry.accountId?.startsWith('512')) {
      return sum + (entry.debit || 0) - (entry.credit || 0);
    }
    return sum;
  }, 0);

  const projectedInflow = invoices
    .filter(inv => inv.type === 'sale')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const projectedOutflow = invoices
    .filter(inv => inv.type === 'purchase')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  // Chart Data (Last 6 months)
  const chartData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, 'MMM', { locale: fr });
    const monthKey = format(date, 'yyyy-MM');
    
    const monthInflow = entries
      .filter(e => e.date.startsWith(monthKey) && e.accountId?.startsWith('512') && e.debit > 0)
      .reduce((sum, e) => sum + (e.debit || 0), 0);

    const monthOutflow = entries
      .filter(e => e.date.startsWith(monthKey) && e.accountId?.startsWith('512') && e.credit > 0)
      .reduce((sum, e) => sum + (e.credit || 0), 0);

    return {
      name: monthStr,
      inflow: monthInflow,
      outflow: monthOutflow,
      net: monthInflow - monthOutflow,
      fullDate: monthKey
    };
  });

  const handleDownloadReport = () => {
    const headers = [['Mois', 'Encaissements', 'Décaissements', 'Flux Net']];
    const dataRows = chartData.map(d => [
      d.name, 
      d.inflow.toLocaleString(), 
      d.outflow.toLocaleString(), 
      d.net.toLocaleString() + ' ' + (company?.currency || '€')
    ]);
    downloadPDF('Rapport de Flux de Trésorerie', headers, dataRows, 'Tresorerie_Flux_Report');
  };

  const upcomingPayments = invoices
    .filter(inv => inv.type === 'purchase')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const bankStatus = banks.length > 0 ? 'Synchronisé' : 'Non connecté';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suivi Trésorerie</h1>
          <p className="text-muted-foreground">Analyse prédictive et pilotage en temps réel de vos liquidités.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-2 shadow-sm" onClick={handleDownloadReport}>
            <Download size={14} /> Exporter PDF
          </Button>
          <Button size="sm" className="h-9 text-xs gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700">
            <Zap size={14} /> Optimisation IA
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Wallet size={48} className="text-indigo-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Solde Consolidé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 font-mono">{currentBalance.toLocaleString()} {company?.currency}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-bold">
                <RefreshCw size={8} className="mr-1 animate-spin-slow" /> LIVE
              </Badge>
              <span className="text-[10px] text-slate-400 font-medium">{banks.length} comptes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Encaissements (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700 font-mono">+{projectedInflow.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] mt-2 text-emerald-600/70 font-bold">
              <ArrowUpRight size={12} /> {invoices.filter(i => i.type === 'sale').length} factures clients
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-rose-50/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Décaissements (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-700 font-mono">-{projectedOutflow.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] mt-2 text-rose-600/70 font-bold">
              <ArrowDownLeft size={12} /> {invoices.filter(i => i.type === 'purchase').length} factures fournisseurs
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atterrissage Estimé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 font-mono">{(currentBalance + projectedInflow - projectedOutflow).toLocaleString()}</div>
            <div className="flex items-center gap-1 text-[10px] mt-2 text-slate-400 font-bold">
              <BarChart3 size={12} /> Projection à J+30
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Flux de Trésorerie Mensuel</CardTitle>
                <CardDescription className="text-[10px] font-medium">Comparatif des flux réels sur les 6 derniers mois</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded border border-emerald-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase">In</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 rounded border border-rose-100">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[9px] font-black text-rose-700 uppercase">Out</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[380px] pt-8 bg-white">
            <ResponsiveContainer width="100%" height="100%" minHeight={380}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Area type="monotone" dataKey="net" fill="url(#colorNet)" stroke="transparent" />
                <Bar dataKey="inflow" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} name="Encaissements" />
                <Bar dataKey="outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} name="Décaissements" />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Flux Net" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-3 bg-slate-50/50 border-b py-3">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Clock size={14} className="text-indigo-600" />
                Échéances Critiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 bg-white">
              <div className="divide-y divide-slate-100">
                {upcomingPayments.length > 0 ? (
                  upcomingPayments.map((inv) => (
                    <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-800 truncate max-w-[140px] uppercase tracking-tight">{inv.contactName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[8px] h-4 px-1 bg-slate-100 text-slate-500 border-slate-200 font-bold">
                            {inv.number}
                          </Badge>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">J-{Math.ceil((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-rose-600 font-mono">-{inv.totalAmount.toLocaleString()} {company?.currency}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{format(new Date(inv.dueDate), 'dd MMM', { locale: fr })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24} />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune alerte de paiement</p>
                  </div>
                )}
              </div>
              <div className="p-3 border-t bg-slate-50/30">
                <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-black uppercase tracking-widest gap-2 text-indigo-600 hover:bg-indigo-50">
                  Gérer l'échéancier complet <ArrowRight size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-900 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Activity size={120} />
            </div>
            <CardHeader className="pb-2 border-b border-slate-800">
              <CardTitle className="text-[10px] font-black flex items-center gap-2 text-slate-400 uppercase tracking-widest">
                <Activity size={14} className="text-indigo-400" />
                Santé Financière
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score de Liquidité</p>
                    <div className="text-4xl font-black font-mono">84<span className="text-sm text-slate-600 ml-1">/100</span></div>
                  </div>
                  <Badge className="bg-indigo-500 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 py-1">Optimal</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[84%] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  </div>
                  <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Risque Élevé</span>
                    <span>Sécurisé</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-[10px] text-slate-300 leading-relaxed font-medium italic">
                    "Votre réserve de trésorerie couvre 4.2 mois de charges d'exploitation. Capacité d'investissement confirmée."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
