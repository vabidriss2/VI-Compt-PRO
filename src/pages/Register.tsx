import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Lock, User, Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { AFRICAN_CURRENCIES } from '../constants/currencies';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('XAF');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.currentUser) {
      setEmail(auth.currentUser.email || '');
      setDisplayName(auth.currentUser.displayName || '');
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let user = auth.currentUser;

      // 1. Create Auth User if not already logged in
      if (!user) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      if (!user) throw new Error("Utilisateur non trouvé");

      // 2. Create Company
      const companyRef = await addDoc(collection(db, 'companies'), {
        name: companyName,
        currency: currency,
        createdAt: new Date().toISOString(),
        ownerId: user.uid
      });

      // 3. Create User Profile
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email || email,
        displayName: displayName || user.displayName,
        role: 'super_admin',
        companyId: companyRef.id,
        createdAt: new Date().toISOString()
      });

      // 4. Initialize basic Chart of Accounts
      const initialAccounts = [
        { code: '1010', name: 'Caisse', type: 'asset' },
        { code: '1020', name: 'Banque', type: 'asset' },
        { code: '4110', name: 'Clients', type: 'asset' },
        { code: '4010', name: 'Fournisseurs', type: 'liability' },
        { code: '1011', name: 'Capital Social', type: 'equity' },
        { code: '7010', name: 'Ventes de marchandises', type: 'revenue' },
        { code: '6010', name: 'Achats de marchandises', type: 'expense' },
      ];

      for (const acc of initialAccounts) {
        await addDoc(collection(db, `companies/${companyRef.id}/accounts`), {
          ...acc,
          companyId: companyRef.id,
          isActive: true
        });
      }

      toast.success("Compte créé avec succès !");
      navigate('/');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'registration');
      toast.error("Erreur d'inscription : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Building2 size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
          <CardDescription>
            Rejoignez VI Compt PRO et modernisez votre comptabilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="displayName" 
                    placeholder="Jean Dupont" 
                    className="pl-10"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="jean@entreprise.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="companyName" 
                  placeholder="Ma Super Entreprise SARL" 
                  className="pl-10"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Devise de base</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full">
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
              </div>
              {!auth.currentUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Création en cours..." : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm">
          <span className="text-muted-foreground">Vous avez déjà un compte ?</span>
          <Link to="/login" className="text-primary hover:underline font-medium">
            Se connecter
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
