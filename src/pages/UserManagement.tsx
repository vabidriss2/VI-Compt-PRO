import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { 
  UserCog, 
  Shield, 
  User, 
  Mail, 
  ShieldCheck, 
  UserPlus, 
  MoreVertical, 
  Trash2, 
  CheckCircle2, 
  Clock,
  ShieldAlert,
  Info,
  Fingerprint,
  Lock,
  History,
  Activity,
  UserCheck,
  Ban,
  Key,
  Smartphone,
  Globe,
  Settings,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';

export default function UserManagement() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, 'users'),
      where('companyId', '==', userData.companyId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [userData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === userData?.uid) {
      toast.error("Vous ne pouvez pas modifier votre propre rôle.");
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'users', userId, { role: newRole });
      
      toast.success("Rôle mis à jour !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      toast.error("Erreur : " + error.message);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge className="bg-purple-600 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm shadow-purple-100">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm shadow-indigo-100">Administrateur</Badge>;
      case 'accountant': return <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm shadow-emerald-100">Comptable</Badge>;
      case 'viewer': return <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Consultant</Badge>;
      default: return <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilisateurs & Droits</h1>
          <p className="text-muted-foreground">Gérez les accès, les rôles et la gouvernance de votre équipe financière.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-50 gap-2">
            <Settings size={14} /> Paramètres Sécurité
          </Button>
          <Button size="sm" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100">
            <UserPlus size={14} /> Inviter un membre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilisateurs</p>
                <h3 className="text-3xl font-black text-slate-900">{users.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <User size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Actifs</p>
                <h3 className="text-3xl font-black text-emerald-600">{users.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Activity size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-amber-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Invitations</p>
                <h3 className="text-3xl font-black text-amber-600">1</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Mail size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Score Sécurité</p>
                <h3 className="text-3xl font-black text-blue-600">85%</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="text-indigo-600" size={16} />
                    Membres de l'organisation
                  </CardTitle>
                  <CardDescription className="text-[10px] font-medium">Gestion des accès authentifiés et des niveaux de privilèges.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Rechercher un membre..." className="pl-10 h-9 text-[11px] font-bold border-slate-200 focus:border-indigo-500 shadow-sm" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Utilisateur</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Rôle & Permissions</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Dernière Connexion</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Statut</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 border-slate-100 group">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm border border-indigo-200 shadow-sm">
                              {user.displayName?.[0] || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                              {user.displayName}
                              {user.id === userData?.uid && <Badge className="bg-indigo-600 text-white border-none text-[8px] h-3.5 px-1 font-black uppercase">Moi</Badge>}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium lowercase">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5">
                          {getRoleBadge(user.role)}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-600">Aujourd'hui, 14:23</span>
                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                            <Globe size={10} /> Paris, FR • Chrome
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] font-black uppercase tracking-widest px-2">Actif</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Select 
                            disabled={user.id === userData?.uid || userData?.role !== 'super_admin'}
                            value={user.role} 
                            onValueChange={(v) => handleRoleChange(user.id, v)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-[10px] font-black uppercase tracking-widest bg-white border-slate-200 shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="text-[10px] font-black uppercase tracking-widest">
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="accountant">Comptable</SelectItem>
                              <SelectItem value="viewer">Consultant</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <MoreVertical size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-[10px] font-black uppercase tracking-widest w-48 p-2">
                              <DropdownMenuItem className="gap-3 py-2 rounded-lg cursor-pointer"><User size={14} className="text-slate-400" /> Voir le profil</DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 rounded-lg cursor-pointer"><History size={14} className="text-slate-400" /> Journal d'audit</DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 rounded-lg cursor-pointer"><Smartphone size={14} className="text-slate-400" /> Appareils de confiance</DropdownMenuItem>
                              <Separator className="my-1" />
                              <DropdownMenuItem className="gap-3 py-2 rounded-lg cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"><Ban size={14} /> Révoquer l'accès</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-amber-100 bg-amber-50/30 shadow-sm border-dashed overflow-hidden">
            <CardHeader className="py-3 bg-amber-50/50 border-b border-amber-100/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <Clock size={14} /> Invitations en attente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-amber-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                    <Mail size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">expert@cabinet-compta.fr</span>
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={10} /> Envoyée il y a 2 jours • Expire dans 5 jours
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600">Annuler</Button>
                  <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-amber-600 border-amber-200 bg-white hover:bg-amber-50 shadow-sm">Renvoyer</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <ShieldAlert size={14} className="text-indigo-600" />
                Matrice des Rôles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Super Admin</p>
                    <Badge className="bg-indigo-100 text-indigo-700 border-none text-[8px] font-black">FULL</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Contrôle total de l'organisation, gestion des utilisateurs et paramètres critiques.</p>
                </div>
                <Separator className="bg-slate-100" />
                <div className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Administrateur</p>
                    <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black">WRITE</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Gestion opérationnelle, facturation, tiers et écritures comptables.</p>
                </div>
                <Separator className="bg-slate-100" />
                <div className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Comptable</p>
                    <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-black">WRITE</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Saisie des écritures, consultation des états financiers et déclarations fiscales.</p>
                </div>
                <Separator className="bg-slate-100" />
                <div className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Consultant</p>
                    <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black">READ</Badge>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Lecture seule sur les rapports, la balance et le grand livre.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg border border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <Fingerprint size={18} className="text-indigo-400" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Sécurité</p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-medium italic mb-4">
                    "La sécurité de vos données financières repose sur le principe du moindre privilège."
                  </p>
                  <Button variant="outline" size="sm" className="w-full h-9 text-[9px] font-black uppercase tracking-widest bg-transparent border-slate-700 text-white hover:bg-slate-800">
                    <Lock size={12} className="mr-2" /> Activer 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
