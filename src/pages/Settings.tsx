import { useState, useEffect } from 'react';
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
import { Building2, User, Shield, Bell, Globe, Save, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { AFRICAN_CURRENCIES } from '../constants/currencies';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

export default function Settings() {
  const { userData, company } = useAuth();
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Gérez vos préférences et les informations de votre entreprise.</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company" className="gap-2">
            <Building2 size={16} /> Entreprise
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User size={16} /> Profil
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield size={16} /> Sécurité
          </TabsTrigger>
          <TabsTrigger value="installation" className="gap-2">
            <Globe size={16} /> Installation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>Ces informations apparaîtront sur vos factures et rapports.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nom de l'entreprise</Label>
                  <Input 
                    id="companyName" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Identifiant Fiscal (NIF/RCCM)</Label>
                  <Input 
                    id="taxId" 
                    value={taxId} 
                    onChange={(e) => setTaxId(e.target.value)} 
                    placeholder="ex: 123456789"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Devise de base</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full lg:w-1/2">
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-muted-foreground" />
                      <SelectValue placeholder="Choisir une devise" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {AFRICAN_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Note : Changer la devise de base peut affecter la cohérence de vos rapports existants.</p>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleUpdateCompany} disabled={loading} className="gap-2 w-full lg:w-auto">
                  <Save size={18} />
                  {loading ? "Synchronisation..." : "Sauvegarder & Synchroniser"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Mon Profil</CardTitle>
              <CardDescription>Gérez vos informations personnelles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {userData?.displayName?.[0] || 'U'}
                </div>
                <Button variant="outline">Changer la photo</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={userData?.email} disabled className="bg-muted" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateProfile} disabled={loading} className="gap-2">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                  {loading ? "Synchronisation..." : "Sauvegarder & Synchroniser"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Sécurité & Accès</CardTitle>
              <CardDescription>Paramètres de sécurité de votre compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Changer le mot de passe</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input type="password" placeholder="Ancien mot de passe" />
                  <Input type="password" placeholder="Nouveau mot de passe" />
                  <Input type="password" placeholder="Confirmer le nouveau" />
                </div>
                <Button variant="outline">Mettre à jour le mot de passe</Button>
              </div>
              
              <div className="pt-6 border-t">
                <h3 className="text-sm font-medium mb-4">Rôles & Permissions</h3>
                <div className="p-4 bg-muted rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold capitalize">{userData?.role?.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">Votre rôle actuel dans l'organisation.</p>
                    </div>
                    <Badge>Propriétaire</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="installation">
          <Card>
            <CardHeader>
              <CardTitle>Installation sur votre environnement</CardTitle>
              <CardDescription>Installez VI Compt PRO en tant qu'application locale sur Windows, Linux ou Mac.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous pouvez installer VI Compt PRO pour y accéder directement depuis votre bureau.
              </p>
              <Button className="gap-2" onClick={() => window.open('/README.md', '_blank')}>
                <Globe size={18} /> Voir le guide d'installation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
