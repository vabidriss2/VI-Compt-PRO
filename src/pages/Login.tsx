import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        toast.error("Utilisateur non trouvé dans la base de données.");
        await auth.signOut();
      } else {
        toast.success("Connexion réussie !");
        navigate('/');
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error("Email ou mot de passe incorrect. Si vous vous êtes inscrit avec Google, vous devez définir un mot de passe via 'Mot de passe oublié'.");
      } else {
        handleFirestoreError(error, OperationType.GET, `users/${email}`);
        toast.error("Erreur de connexion : " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    console.log("Tentative de réinitialisation pour:", email);
    if (!email || !email.includes('@')) {
      toast.error("Veuillez saisir une adresse email valide dans le champ Email ci-dessus.");
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Email de réinitialisation envoyé avec succès");
      toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte de réception (et vos spams).");
    } catch (error: any) {
      console.error("Erreur réinitialisation mot de passe:", error);
      if (error.code === 'auth/user-not-found') {
        toast.error("Aucun compte n'est associé à cette adresse email.");
      } else {
        toast.error("Erreur : " + error.message);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Redirect to register if not found
        toast.info("Veuillez finaliser votre inscription.");
        navigate('/register');
      } else {
        toast.success("Connexion réussie !");
        navigate('/');
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error("Connexion annulée.");
      } else {
        handleFirestoreError(error, OperationType.GET, 'users/google');
        toast.error("Erreur Google Login : " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Building2 size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">VI Compt PRO</CardTitle>
          <CardDescription>
            Connectez-vous à votre espace comptable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-sm text-blue-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>
              <strong>Note :</strong> Si vous vous êtes inscrit via Google, vous n'avez pas de mot de passe par défaut. Pour utiliser la connexion par email, cliquez sur <strong>"Mot de passe oublié ?"</strong>.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="nom@entreprise.com" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-primary hover:underline"
                >
                  {resetLoading ? "Envoi..." : "Mot de passe oublié ?"}
                </button>
              </div>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou continuer avec</span>
            </div>
          </div>
          
          <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-1 text-sm">
          <span className="text-muted-foreground">Vous n'avez pas de compte ?</span>
          <Link to="/register" className="text-primary hover:underline font-medium">
            S'inscrire
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
