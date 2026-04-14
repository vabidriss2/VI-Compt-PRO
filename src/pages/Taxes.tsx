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
import { Plus, Edit2, Trash2, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Taxes() {
  const { userData } = useAuth();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [newTax, setNewTax] = useState({
    name: '',
    rate: 0,
    isActive: true
  });
  
  const [editingTax, setEditingTax] = useState<any>(null);
  const [deletingTax, setDeletingTax] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/taxes`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTaxes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/taxes`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddTax = async () => {
    if (!newTax.name || newTax.rate < 0) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const path = `companies/${userData.companyId}/taxes`;
      await addDoc(collection(db, path), {
        ...newTax,
        companyId: userData.companyId
      });
      toast.success("Taxe ajoutée !");
      setIsAddOpen(false);
      setNewTax({ name: '', rate: 0, isActive: true });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/taxes`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleUpdateTax = async () => {
    if (!editingTax || !userData?.companyId) return;
    
    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/taxes`;
      await updateDoc(doc(db, path, editingTax.id), {
        name: editingTax.name,
        rate: editingTax.rate,
        isActive: editingTax.isActive
      });
      toast.success("Taxe mise à jour !");
      setIsEditOpen(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${userData.companyId}/taxes/${editingTax.id}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTax = async () => {
    if (!deletingTax || !userData?.companyId) return;
    
    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/taxes`;
      await deleteDoc(doc(db, path, deletingTax.id));
      toast.success("Taxe supprimée !");
      setIsDeleteOpen(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${userData.companyId}/taxes/${deletingTax.id}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des Taxes</h1>
          <p className="text-muted-foreground">Configurez les taux de TVA et autres taxes.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} /> Nouvelle Taxe
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une taxe</DialogTitle>
              <DialogDescription>Définissez un nouveau taux de taxe pour votre entreprise.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  placeholder="ex: TVA 20%"
                  value={newTax.name}
                  onChange={(e) => setNewTax({...newTax, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="rate" className="text-right">Taux (%)</Label>
                <Input 
                  id="rate" 
                  type="number"
                  className="col-span-3" 
                  value={newTax.rate}
                  onChange={(e) => setNewTax({...newTax, rate: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddTax}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxes configurées</CardTitle>
          <CardDescription>Liste des taxes disponibles pour vos factures.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Taux</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.length > 0 ? (
                taxes.map((tax) => (
                  <TableRow key={tax.id} className="group">
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tax.rate}% <Percent size={14} className="text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tax.isActive ? 'default' : 'secondary'}>
                        {tax.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTax(tax);
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
                            setDeletingTax(tax);
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
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucune taxe configurée.
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
            <DialogTitle>Modifier la taxe</DialogTitle>
          </DialogHeader>
          {editingTax && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingTax.name}
                  onChange={(e) => setEditingTax({...editingTax, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-rate" className="text-right">Taux (%)</Label>
                <Input 
                  id="edit-rate" 
                  type="number"
                  className="col-span-3" 
                  value={editingTax.rate}
                  onChange={(e) => setEditingTax({...editingTax, rate: parseFloat(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Statut</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Button 
                    variant={editingTax.isActive ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEditingTax({...editingTax, isActive: true})}
                  >
                    Actif
                  </Button>
                  <Button 
                    variant={!editingTax.isActive ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEditingTax({...editingTax, isActive: false})}
                  >
                    Inactif
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateTax} disabled={loading}>
              {loading ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Supprimer la taxe</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer la taxe <strong>{deletingTax?.name}</strong> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteTax} disabled={loading}>
              {loading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
