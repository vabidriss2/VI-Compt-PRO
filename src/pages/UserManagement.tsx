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
import { UserCog, Shield, User, Mail, ShieldCheck } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

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
      case 'super_admin': return <Badge className="bg-purple-500 hover:bg-purple-600">Super Admin</Badge>;
      case 'admin': return <Badge className="bg-blue-500 hover:bg-blue-600">Administrateur</Badge>;
      case 'accountant': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Comptable</Badge>;
      case 'viewer': return <Badge variant="secondary">Consultant</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utilisateurs & Droits</h1>
        <p className="text-muted-foreground">Gérez les accès et les permissions des membres de votre équipe.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="text-primary" size={20} />
            Membres de l'organisation
          </CardTitle>
          <CardDescription>Liste des utilisateurs ayant accès à cette entreprise.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle Actuel</TableHead>
                <TableHead className="text-right">Modifier le rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.displayName?.[0] || 'U'}
                      </div>
                      <span className="font-medium">{user.displayName}</span>
                      {user.id === userData?.uid && <Badge variant="outline" className="text-[10px]">Moi</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail size={14} />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Select 
                        disabled={user.id === userData?.uid || userData?.role !== 'super_admin'}
                        value={user.role} 
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Administrateur</SelectItem>
                          <SelectItem value="accountant">Comptable</SelectItem>
                          <SelectItem value="viewer">Consultant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">Rôles & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p><strong>Super Admin:</strong> Accès total, gestion des utilisateurs et paramètres critiques.</p>
            <p><strong>Administrateur:</strong> Gestion quotidienne, facturation, contacts et écritures.</p>
            <p><strong>Comptable:</strong> Saisie des écritures, consultation des états et fiscalité.</p>
            <p><strong>Consultant:</strong> Lecture seule sur les rapports et la balance.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
