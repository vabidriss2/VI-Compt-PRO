import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  History, 
  User, 
  Database, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Activity,
  RefreshCw,
  Trash2,
  Plus,
  Edit3,
  ExternalLink,
  Shield,
  Lock,
  Zap,
  Terminal
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function AuditLogs() {
  const { userData } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/audit_logs`),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/audit_logs`);
    });

    return () => unsubscribe();
  }, [userData]);

  const [selectedLog, setSelectedLog] = useState<any>(null);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <Plus size={12} className="text-emerald-500" />;
      case 'UPDATE': return <Edit3 size={12} className="text-blue-500" />;
      case 'DELETE': return <Trash2 size={12} className="text-rose-500" />;
      default: return <Activity size={12} className="text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'DELETE': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal d'Audit</h1>
          <p className="text-muted-foreground italic text-sm">Traçabilité complète des opérations pour la conformité et la sécurité.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-8 gap-2 bg-emerald-50 border-emerald-200 text-emerald-600 font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Feed Active
          </Badge>
          <div className="h-8 w-px bg-slate-200 mx-1" />
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} /> Exporter
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter size={14} /> Filtres
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:ring-1 hover:ring-slate-400 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-caps text-slate-400 mb-1">Événements (24h)</p>
                <h3 className="text-3xl font-black text-slate-900 mono-data">{logs.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <Activity size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:ring-1 hover:ring-emerald-400 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-caps text-emerald-400 mb-1">Créations</p>
                <h3 className="text-3xl font-black text-emerald-600 mono-data">{logs.filter(l => l.action === 'CREATE').length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Plus size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:ring-1 hover:ring-blue-400 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-caps text-blue-400 mb-1">Modifications</p>
                <h3 className="text-3xl font-black text-blue-600 mono-data">{logs.filter(l => l.action === 'UPDATE').length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Edit3 size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:ring-1 hover:ring-rose-400 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-caps text-rose-400 mb-1">Suppressions</p>
                <h3 className="text-3xl font-black text-rose-600 mono-data">{logs.filter(l => l.action === 'DELETE').length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                <Trash2 size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-400" />
        <CardHeader className="bg-slate-50/30 border-b py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Terminal className="text-slate-900" size={16} />
                Système de Monitoring Audit
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">Flux d'événements cryptographiques et opérationnels.</CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Filtrer les journaux..." 
                className="pl-10 h-10 text-xs font-black border-slate-200 focus:border-slate-400 transition-colors bg-white shadow-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Horodatage</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Acteur</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Opération</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Ressource</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Détails de l'événement</TableHead>
                <TableHead className="w-[50px] h-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 border-slate-100 group transition-colors">
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-700 uppercase">
                          {log.timestamp ? format(new Date(log.timestamp), 'dd MMM yyyy', { locale: fr }) : '-'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                          <Clock size={10} />
                          {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 shadow-sm">
                          {log.userId?.slice(0, 2).toUpperCase() || '??'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Utilisateur</span>
                          <span className="text-[9px] font-mono text-slate-400">{log.userId?.slice(0, 12)}...</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center border",
                          getActionColor(log.action)
                        )}>
                          {getActionIcon(log.action)}
                        </div>
                        <Badge variant="outline" className={cn(
                          "text-[8px] h-4 px-1.5 font-black uppercase tracking-widest border-none",
                          getActionColor(log.action)
                        )}>
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                          <Database size={12} />
                        </div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{log.collection}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3 max-w-[300px]">
                        <FileText size={14} className="text-slate-300 shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] text-slate-600 font-bold truncate">
                            {log.documentId ? `Document: ${log.documentId}` : 'Nouvelle entrée'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium truncate italic">
                            {log.details ? JSON.stringify(log.details) : 'Aucun détail supplémentaire'}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() => setSelectedLog(log)}
                          >
                            <ExternalLink size={14} />
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px] font-black uppercase tracking-widest">Inspecter l'événement</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-32">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <History size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Aucun événement</p>
                        <p className="text-[10px] font-medium text-slate-400">Le journal d'audit est actuellement vide pour cette organisation.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="bg-slate-900 text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Shield size={20} className="text-indigo-400" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-black uppercase tracking-widest">Inspection d'Événement</DialogTitle>
                  <DialogDescription className="text-[10px] text-slate-400 font-medium">Détails techniques complets de l'opération.</DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "text-[9px] font-black uppercase tracking-widest border-none px-3 py-1",
                selectedLog ? getActionColor(selectedLog.action) : ""
              )}>
                {selectedLog?.action}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Horodatage</p>
                <p className="text-[11px] font-bold">{selectedLog?.timestamp ? format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss') : '-'}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Collection</p>
                <p className="text-[11px] font-bold uppercase">{selectedLog?.collection}</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">ID Document</p>
                <p className="text-[11px] font-mono font-bold truncate">{selectedLog?.documentId || 'N/A'}</p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Terminal size={12} /> Payload de l'opération
              </h4>
              <ScrollArea className="h-[250px] w-full rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <pre className="text-[11px] font-mono text-slate-700 leading-relaxed">
                  {JSON.stringify(selectedLog?.details, null, 2)}
                </pre>
              </ScrollArea>
            </div>

            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                <Lock size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-0.5">Vérification d'Intégrité</p>
                <p className="text-[10px] text-indigo-600 font-medium leading-tight">
                  Cet événement a été signé numériquement et ne peut être modifié. Il constitue une preuve légale de l'opération.
                </p>
              </div>
              <Zap size={20} className="text-indigo-300" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
