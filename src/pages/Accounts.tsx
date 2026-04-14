import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

export default function Accounts() {
  const { userData } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    type: 'asset',
    isActive: true
  });
  
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [deletingAccount, setDeletingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accs.sort((a: any, b: any) => a.code.localeCompare(b.code)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddAccount = async () => {
    if (!newAccount.code || !newAccount.name || !userData?.companyId) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/accounts`;
      await addDoc(collection(db, path), {
        ...newAccount,
        companyId: userData.companyId
      });
      
      await logAction(userData.companyId, userData.uid, 'CREATE', 'accounts', null, newAccount);
      
      toast.success("Compte ajouté avec succès !");
      setIsAddOpen(false);
      setNewAccount({ code: '', name: '', type: 'asset', isActive: true });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/accounts`);
      toast.error("Erreur lors de l'ajout : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount.code || !editingAccount.name || !userData?.companyId) return;
    
    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/accounts`;
      await updateDoc(doc(db, path, editingAccount.id), {
        code: editingAccount.code,
        name: editingAccount.name,
        type: editingAccount.type,
        isActive: editingAccount.isActive
      });
      
      await logAction(userData.companyId, userData.uid, 'UPDATE', 'accounts', editingAccount.id, editingAccount);
      
      toast.success("Compte mis à jour !");
      setIsEditOpen(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${userData.companyId}/accounts/${editingAccount.id}`);
      toast.error("Erreur lors de la mise à jour : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount || !userData?.companyId) return;
    
    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/accounts`;
      await deleteDoc(doc(db, path, deletingAccount.id));
      
      await logAction(userData.companyId, userData.uid, 'DELETE', 'accounts', deletingAccount.id, deletingAccount);
      
      toast.success("Compte supprimé !");
      setIsDeleteOpen(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${userData.companyId}/accounts/${deletingAccount.id}`);
      toast.error("Erreur lors de la suppression : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'asset': return 'Actif';
      case 'liability': return 'Passif';
      case 'equity': return 'Capitaux Propres';
      case 'revenue': return 'Produit';
      case 'expense': return 'Charge';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'liability': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'equity': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'revenue': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'expense': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const typeText = getTypeText(acc.type).toLowerCase();
    const matchesSearch = acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         acc.code.includes(searchTerm) ||
                         typeText.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || acc.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Comptable</h1>
          <p className="text-muted-foreground">Gérez la structure de vos comptes financiers.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau Compte
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un compte</DialogTitle>
              <DialogDescription>Créez un nouveau compte dans votre plan comptable.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input 
                  id="code" 
                  className="col-span-3" 
                  placeholder="ex: 1010"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  placeholder="ex: Caisse Centrale"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  value={newAccount.type} 
                  onValueChange={(v) => setNewAccount({...newAccount, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Actif</SelectItem>
                    <SelectItem value="liability">Passif</SelectItem>
                    <SelectItem value="equity">Capitaux Propres</SelectItem>
                    <SelectItem value="revenue">Produit</SelectItem>
                    <SelectItem value="expense">Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddAccount}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des comptes</CardTitle>
              <CardDescription>Consultez et gérez vos comptes actifs.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrer par type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="asset">Actif</SelectItem>
                  <SelectItem value="liability">Passif</SelectItem>
                  <SelectItem value="equity">Capitaux Propres</SelectItem>
                  <SelectItem value="revenue">Produit</SelectItem>
                  <SelectItem value="expense">Charge</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Nom du compte</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc) => (
                  <TableRow key={acc.id} className="group">
                    <TableCell className="font-mono font-bold">{acc.code}</TableCell>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize border-none shadow-none", getTypeColor(acc.type))}>
                        {getTypeText(acc.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={acc.isActive ? 'default' : 'secondary'}>
                        {acc.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingAccount(acc);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDeletingAccount(acc);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun compte trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>Mettez à jour les informations de ce compte.</DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-code" className="text-right">Code</Label>
                <Input 
                  id="edit-code" 
                  className="col-span-3" 
                  value={editingAccount.code}
                  onChange={(e) => setEditingAccount({...editingAccount, code: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">Type</Label>
                <Select 
                  value={editingAccount.type} 
                  onValueChange={(v) => setEditingAccount({...editingAccount, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Actif</SelectItem>
                    <SelectItem value="liability">Passif</SelectItem>
                    <SelectItem value="equity">Capitaux Propres</SelectItem>
                    <SelectItem value="revenue">Produit</SelectItem>
                    <SelectItem value="expense">Charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Statut</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Button 
                    variant={editingAccount.isActive ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEditingAccount({...editingAccount, isActive: true})}
                  >
                    Actif
                  </Button>
                  <Button 
                    variant={!editingAccount.isActive ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEditingAccount({...editingAccount, isActive: false})}
                  >
                    Inactif
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateAccount} disabled={loading}>
              {loading ? "Mise à jour..." : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le compte <strong>{deletingAccount?.code} - {deletingAccount?.name}</strong> ? 
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={loading}>
              {loading ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
