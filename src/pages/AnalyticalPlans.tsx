import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
import { Plus, Trash2, Edit2, Layers, Search, Info, Target, Briefcase, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';

export default function AnalyticalPlans() {
  const { userData } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/analytical_plans`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/analytical_plans`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddPlan = async () => {
    if (!newPlan.code || !newPlan.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    try {
      const path = `companies/${userData.companyId}/analytical_plans`;
      await addDoc(collection(db, path), {
        ...newPlan,
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'analytical_plans', null, newPlan);
      
      toast.success("Axe analytique ajouté !");
      setIsAddOpen(false);
      setNewPlan({ code: '', name: '', description: '' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/analytical_plans`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleUpdatePlan = async () => {
    if (!editingPlan.code || !editingPlan.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    try {
      const planRef = doc(db, `companies/${userData.companyId}/analytical_plans`, editingPlan.id);
      const { id, ...updateData } = editingPlan;
      await updateDoc(planRef, updateData);
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'analytical_plans', editingPlan.id, updateData);
      
      toast.success("Axe analytique mis à jour !");
      setIsEditOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/analytical_plans`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet axe analytique ?")) return;

    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/analytical_plans`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'analytical_plans', id, null);
      toast.success("Axe analytique supprimé !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/analytical_plans`);
      toast.error("Erreur : " + error.message);
    }
  };

  const filteredPlans = plans.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Analytique</h1>
          <p className="text-muted-foreground">Gérez vos axes analytiques (projets, centres de coûts, départements).</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouvel Axe
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un axe analytique</DialogTitle>
              <DialogDescription>Définissez un nouvel axe pour la ventilation de vos charges et produits.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input 
                  id="code" 
                  className="col-span-3" 
                  placeholder="ex: PROJ"
                  value={newPlan.code}
                  onChange={(e) => setNewPlan({...newPlan, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  placeholder="ex: Projets"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input 
                  id="description" 
                  className="col-span-3" 
                  placeholder="ex: Ventilation par projet client"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddPlan}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Axes Analytiques</CardTitle>
              <CardDescription>Liste des axes de ventilation configurés pour votre comptabilité analytique.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un axe..." 
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Nom de l'Axe</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length > 0 ? (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono font-bold border-primary/20 text-primary bg-primary/5">
                        {plan.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{plan.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingPlan(plan);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePlan(plan.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted rounded-full">
                        <Layers size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">Aucun axe analytique trouvé</p>
                        <p className="text-sm">Créez des axes pour ventiler vos charges par projet ou département.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="mt-2">
                        <Plus size={14} className="mr-2" /> Nouvel Axe
                      </Button>
                    </div>
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
            <DialogTitle>Modifier l'axe analytique</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-code" className="text-right">Code</Label>
                <Input 
                  id="edit-code" 
                  className="col-span-3" 
                  value={editingPlan.code}
                  onChange={(e) => setEditingPlan({...editingPlan, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Input 
                  id="edit-description" 
                  className="col-span-3" 
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdatePlan}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
