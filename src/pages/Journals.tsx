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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Trash2, Edit2, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

export default function Journals() {
  const { userData } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<any>(null);
  const [newJournal, setNewJournal] = useState({
    code: '',
    name: '',
    type: 'general'
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/journals`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddJournal = async () => {
    if (!newJournal.code || !newJournal.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    try {
      const path = `companies/${userData.companyId}/journals`;
      await addDoc(collection(db, path), {
        ...newJournal,
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'journals', null, newJournal);
      
      toast.success("Journal ajouté !");
      setIsAddOpen(false);
      setNewJournal({ code: '', name: '', type: 'general' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/journals`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleUpdateJournal = async () => {
    if (!editingJournal.code || !editingJournal.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    try {
      const journalRef = doc(db, `companies/${userData.companyId}/journals`, editingJournal.id);
      const { id, ...updateData } = editingJournal;
      await updateDoc(journalRef, updateData);
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'journals', editingJournal.id, updateData);
      
      toast.success("Journal mis à jour !");
      setIsEditOpen(false);
      setEditingJournal(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/journals`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce journal ?")) return;

    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/journals`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'journals', id, null);
      toast.success("Journal supprimé !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/journals`);
      toast.error("Erreur : " + error.message);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Achats';
      case 'sale': return 'Ventes';
      case 'bank': return 'Banque';
      case 'cash': return 'Caisse';
      case 'general': return 'Opérations Diverses';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Codes Journaux</h1>
          <p className="text-muted-foreground">Configurez vos journaux comptables (Achats, Ventes, Banque, etc.).</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau Journal
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un journal</DialogTitle>
              <DialogDescription>Créez un nouveau journal pour vos écritures.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input 
                  id="code" 
                  className="col-span-3" 
                  placeholder="ex: ACH"
                  value={newJournal.code}
                  onChange={(e) => setNewJournal({...newJournal, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  placeholder="ex: Journal des Achats"
                  value={newJournal.name}
                  onChange={(e) => setNewJournal({...newJournal, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  value={newJournal.type} 
                  onValueChange={(v) => setNewJournal({...newJournal, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Achats</SelectItem>
                    <SelectItem value="sale">Ventes</SelectItem>
                    <SelectItem value="bank">Banque</SelectItem>
                    <SelectItem value="cash">Caisse</SelectItem>
                    <SelectItem value="general">Opérations Diverses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddJournal}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des journaux</CardTitle>
          <CardDescription>Tous les journaux configurés pour votre entreprise.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journals.length > 0 ? (
                journals.map((journal) => (
                  <TableRow key={journal.id}>
                    <TableCell className="font-bold">{journal.code}</TableCell>
                    <TableCell>{journal.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(journal.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setEditingJournal(journal);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDeleteJournal(journal.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucun journal configuré.
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
            <DialogTitle>Modifier le journal</DialogTitle>
          </DialogHeader>
          {editingJournal && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-code" className="text-right">Code</Label>
                <Input 
                  id="edit-code" 
                  className="col-span-3" 
                  value={editingJournal.code}
                  onChange={(e) => setEditingJournal({...editingJournal, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingJournal.name}
                  onChange={(e) => setEditingJournal({...editingJournal, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">Type</Label>
                <Select 
                  value={editingJournal.type} 
                  onValueChange={(v) => setEditingJournal({...editingJournal, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Achats</SelectItem>
                    <SelectItem value="sale">Ventes</SelectItem>
                    <SelectItem value="bank">Banque</SelectItem>
                    <SelectItem value="cash">Caisse</SelectItem>
                    <SelectItem value="general">Opérations Diverses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateJournal}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
