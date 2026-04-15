import { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Save, 
  RefreshCw, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard, 
  Key, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { AFRICAN_CURRENCIES } from '../constants/currencies';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function Settings() {
  const { userData, company } = useAuth();
  const { isInstallable, installApp } = usePWAInstall();
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [taxId, setTaxId] = useState(company?.taxId || '');
  const [currency, setCurrency] = useState(company?.currency || 'XAF');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(userData?.displayName || '');

  // Sync state with company data when it loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '');
      setTaxId(company.taxId || '');
      if (company.currency) {
        setCurrency(company.currency);
      }
    }
    if (userData) {
      setDisplayName(userData.displayName || '');
    }
  }, [company, userData]);

  const handleUpdateProfile = async () => {
    if (!userData?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        displayName: displayName
      });
      toast.success("Profil mis à jour !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userData.uid}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const path = `companies/${userData.companyId}`;
      await updateDoc(doc(db, 'companies', userData.companyId), {
        name: companyName,
        taxId: taxId,
        currency: currency
      });
      toast.success("Informations de l'entreprise mises à jour !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${userData.companyId}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paramètres Système</h1>
          <p className="text-muted-foreground">Configurez votre environnement de travail et les préférences de votre organisation.</p>
        </div>
        <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Système Opérationnel</span>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 h-11 border border-slate-200 shadow-sm">
          <TabsTrigger value="company" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
            <Building2 size={14} /> Organisation
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
            <User size={14} /> Profil Utilisateur
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
            <Shield size={14} /> Sécurité & Accès
          </TabsTrigger>
          <TabsTrigger value="installation" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm px-6">
            <Smartphone size={14} /> Application PWA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Identité de l'Organisation</CardTitle>
              <CardDescription className="text-[10px] font-medium">Ces informations sont utilisées pour la génération de vos documents légaux.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden group relative transition-all hover:border-indigo-300">
                    <Building2 size={48} className="text-slate-300 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest">Modifier</Button>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold text-center max-w-[140px] uppercase tracking-tighter">Logo PNG/JPG (Max 2Mo)</p>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Raison Sociale</Label>
                    <Input 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identifiant Fiscal (NIF/RCCM)</Label>
                    <Input 
                      value={taxId} 
                      onChange={(e) => setTaxId(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Devise de Tenue de Compte</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="h-10 text-xs font-bold border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs font-bold">
                        {AFRICAN_CURRENCIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Exercice Comptable</Label>
                    <div className="h-10 px-3 flex items-center bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-600">
                      01 Janvier - 31 Décembre
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <MapPin size={12} /> Siège Social
                  </Label>
                  <Input placeholder="Adresse complète" className="h-9 text-xs border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Phone size={12} /> Contact Téléphonique
                  </Label>
                  <Input placeholder="+237 ..." className="h-9 text-xs border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Mail size={12} /> Email de Facturation
                  </Label>
                  <Input placeholder="billing@..." className="h-9 text-xs border-slate-200" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateCompany} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 h-10 px-10 text-[10px] font-black uppercase tracking-widest shadow-md">
                  <Save size={16} />
                  {loading ? "Synchronisation..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Mon Profil Utilisateur</CardTitle>
              <CardDescription className="text-[10px] font-medium">Informations personnelles et préférences d'affichage.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-black border-4 border-white shadow-sm">
                  {userData?.displayName?.[0] || 'U'}
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest">Changer l'avatar</Button>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Recommandé : 400x400px</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nom Complet</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-10 text-xs font-bold border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adresse Email (Identifiant)</Label>
                  <Input value={userData?.email} disabled className="h-10 text-xs font-bold bg-slate-50 border-slate-200 text-slate-400" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 h-10 px-10 text-[10px] font-black uppercase tracking-widest shadow-md">
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  {loading ? "Synchronisation..." : "Sauvegarder le Profil"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm">
              <CardHeader className="py-4 border-b bg-slate-50/50">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Sécurité du Compte</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Key size={14} /> Authentification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Nouveau mot de passe</Label>
                      <Input type="password" placeholder="••••••••" className="h-9 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold">Confirmation</Label>
                      <Input type="password" placeholder="••••••••" className="h-9 text-xs" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8">Mettre à jour</Button>
                </div>
                
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-4">
                    <Shield size={14} /> Rôles & Accès
                  </h3>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">{userData?.role?.replace('_', ' ')}</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Vous disposez des privilèges d'administration totale.</p>
                      </div>
                    </div>
                    <Badge className="bg-indigo-600 text-white border-none text-[8px] h-4 px-2 font-black uppercase tracking-widest">Actif</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-slate-900 text-white">
              <CardHeader className="py-4 border-b border-slate-800">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-400">Double Authentification (2FA)</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400">
                    <Smartphone size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">Sécurité renforcée</p>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      Ajoutez une couche de sécurité supplémentaire à votre compte en activant la validation par code.
                    </p>
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest h-9">Activer le 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="installation">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Expérience Desktop & Mobile</CardTitle>
              <CardDescription className="text-[10px] font-medium">Installez VI Compt PRO en tant qu'application native sur vos appareils.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Globe size={18} />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-800">Progressive Web App (PWA)</p>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                    VI Compt PRO utilise la technologie PWA, vous permettant de l'installer sur Windows, macOS, Linux, iOS et Android sans passer par les stores officiels.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Accès hors-ligne (Lecture seule)
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Notifications système
                    </li>
                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                      <CheckCircle2 size={12} className="text-emerald-500" /> Lancement rapide depuis le bureau
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600">
                    <Smartphone size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                      {isInstallable ? "Prêt pour l'installation" : "Application Installée"}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                      {isInstallable 
                        ? "Cliquez sur le bouton ci-dessous pour installer VI Compt PRO." 
                        : "L'application est déjà installée sur cet appareil ou n'est pas supportée par ce navigateur."}
                    </p>
                  </div>
                  {isInstallable && (
                    <Button 
                      className="text-[10px] font-black uppercase tracking-widest h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" 
                      onClick={installApp}
                    >
                      <Smartphone size={14} />
                      Installer Maintenant
                    </Button>
                  )}
                  {!isInstallable && (
                    <Button variant="outline" size="sm" className="text-[10px] font-black uppercase tracking-widest h-8" onClick={() => window.open('/README.md', '_blank')}>
                      Guide d'installation
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
