import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Shield, 
  ShieldCheck, 
  Server, 
  Lock, 
  Cloud, 
  History, 
  AlertTriangle,
  FileJson,
  FileArchive,
  HardDrive,
  Activity,
  Zap,
  ArrowUpRight,
  Search,
  Filter,
  MoreHorizontal,
  ChevronRight,
  Cpu,
  Globe
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/audit';

import { downloadCSV } from '../lib/download-utils';

export default function Backup() {
  const { userData } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleDownloadBackup = (date: string) => {
    const data = [
      { Date: date, Status: 'Success', Size: '4.2 MB', Type: 'Full Backup' }
    ];
    downloadCSV(data, `Backup_${date.replace(/[/ :]/g, '_')}`);
  };

  const handleSyncAndBackup = async () => {
    setIsSyncing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (userData?.companyId) {
        await logAction(userData.companyId, userData.uid, 'EXECUTE', 'backup', 'manual', { timestamp: new Date().toISOString() });
      }
      
      toast.success("Données sauvegardées et synchronisées avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sauvegarde & Continuité</h1>
          <p className="text-muted-foreground">Gérez la résilience de vos données financières et les points de restauration.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernière sauvegarde</span>
            <span className="text-[11px] font-bold text-slate-700">Aujourd'hui, 03:00 AM</span>
          </div>
          <Button 
            className="h-11 px-6 gap-2 shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95" 
            onClick={handleSyncAndBackup} 
            disabled={isSyncing}
          >
            <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? "Synchronisation..." : "Lancer Sauvegarde"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <HardDrive size={24} />
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-200 bg-emerald-50 text-emerald-600">Optimal</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espace Utilisé</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">42.8</h3>
                <span className="text-sm font-bold text-slate-400 uppercase">GB</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-500">Quota: 100 GB</span>
                <span className="text-indigo-600">42.8%</span>
              </div>
              <Progress value={42.8} className="h-1.5 bg-slate-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-emerald-200 bg-emerald-50 text-emerald-600">Sécurisé</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rétention</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">30</h3>
                <span className="text-sm font-bold text-slate-400 uppercase">Jours</span>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-medium text-slate-500 leading-tight">
              Points de restauration quotidiens conservés pendant 30 jours glissants.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-amber-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Activity size={24} />
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-amber-200 bg-amber-50 text-amber-600">Actif</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilité</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-slate-900">99.9</h3>
                <span className="text-sm font-bold text-slate-400 uppercase">%</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center">
                    <Globe size={10} className="text-white" />
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-500">Réplication Multi-Zone</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                  <History className="text-indigo-600" size={16} />
                  Archives & Points de Restauration
                </CardTitle>
                <CardDescription className="text-[10px] font-medium">Historique complet des sauvegardes et états du système.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Rechercher une archive..." 
                    className="pl-10 h-9 text-[10px] font-bold border-slate-200 focus:border-indigo-500 shadow-sm"
                  />
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                  <Filter size={14} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Date & Heure</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Type de Snapshot</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Taille</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-12">Statut</TableHead>
                  <TableHead className="w-[100px] h-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: '13/04/2026 03:00', type: 'Automatique', size: '4.2 MB', status: 'Success' },
                  { date: '12/04/2026 03:00', type: 'Automatique', size: '4.1 MB', status: 'Success' },
                  { date: '11/04/2026 15:42', type: 'Manuel', size: '3.9 MB', status: 'Success' },
                  { date: '11/04/2026 03:00', type: 'Automatique', size: '4.0 MB', status: 'Success' },
                  { date: '10/04/2026 03:00', type: 'Automatique', size: '4.2 MB', status: 'Success' },
                ].map((backup, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50 border-slate-100 group transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <FileArchive size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{backup.date}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Snapshot ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-4 px-1.5 font-black uppercase tracking-widest border-none",
                        backup.type === 'Automatique' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {backup.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-[10px] font-black text-slate-600">{backup.size}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Vérifié</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100">
                          <MoreHorizontal size={14} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-1">
                          <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest gap-2 py-2 cursor-pointer" onClick={() => handleDownloadBackup(backup.date)}>
                            <Download size={14} className="text-slate-400" /> Télécharger (CSV)
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest gap-2 py-2 cursor-pointer">
                            <FileJson size={14} className="text-slate-400" /> Exporter en JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-[10px] font-black uppercase tracking-widest gap-2 py-2 cursor-pointer text-indigo-600 focus:text-indigo-700 focus:bg-indigo-50">
                            <RefreshCw size={14} /> Restaurer cet état
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 bg-slate-50/50 border-t flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affichage de 5 sur 30 points de restauration</p>
              <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest gap-2 text-indigo-600 hover:bg-indigo-50">
                Voir tout l'historique <ChevronRight size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b border-indigo-100 bg-indigo-50/50">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-700 flex items-center gap-2">
                <ShieldCheck size={16} />
                Infrastructure & Sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                    <Cloud size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Multi-Cloud Replication</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Réplication synchrone sur 3 zones (Paris, Francfort, Londres).</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                    <Lock size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Chiffrement AES-256</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Archives chiffrées au repos avec rotation automatique des clés.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                    <Cpu size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Vérification d'Intégrité</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Contrôle continu des sommes de contrôle (Checksum) des snapshots.</p>
                  </div>
                </div>
              </div>
              
              <Separator className="bg-indigo-100" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Santé du Système</span>
                  <div className="flex items-center gap-1">
                    <Zap size={10} className="text-emerald-500 fill-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Optimal</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    <span>Latence Synchro</span>
                    <span>12ms</span>
                  </div>
                  <Progress value={95} className="h-1 bg-indigo-100" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b bg-slate-50/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Zone de Restauration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                  Attention : La restauration d'un point antérieur écrasera définitivement les données actuelles.
                </p>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 h-10">
                  Tester la Restauration (Sandbox)
                </Button>
                <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-10">
                  Réinitialiser l'Organisation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
