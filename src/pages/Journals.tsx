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
import { Plus, Trash2, Edit2, ClipboardList, Search, BookOpen, ShoppingCart, CreditCard, Landmark, Wallet, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';

export default function Journals() {
  const { userData } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJournal, setEditingJournal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ShoppingCart size={16} className="text-orange-500" />;
      case 'sale': return <CreditCard size={16} className="text-emerald-500" />;
      case 'bank': return <Landmark size={16} className="text-blue-500" />;
      case 'cash': return <Wallet size={16} className="text-amber-500" />;
      case 'general': return <FileText size={16} className="text-slate-500" />;
      default: return <BookOpen size={16} />;
    }
  };

  const filteredJournals = journals.filter(j => 
    j.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Codes Journaux</h1>
          <p className="text-muted-foreground">Configurez vos journaux comptables (Achats, Ventes, Banque, etc.).</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className="gap-2">
            <Plus size={18} />
            Nouveau Journal
          </DialogTrigger>
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

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Liste des journaux</CardTitle>
              <CardDescription>Tous les journaux configurés pour votre entreprise.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un journal..." 
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
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead>Nom du Journal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJournals.length > 0 ? (
                filteredJournals.map((journal) => (
                  <TableRow key={journal.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono font-bold border-primary/20 text-primary bg-primary/5">
                        {journal.code}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{journal.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          {getTypeIcon(journal.type)}
                        </div>
                        <span className="text-sm font-medium">{getTypeLabel(journal.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingJournal(journal);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteJournal(journal.id)}
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
                        <BookOpen size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">Aucun journal trouvé</p>
                        <p className="text-sm">Commencez par créer un nouveau journal comptable.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="mt-2">
                        <Plus size={14} className="mr-2" /> Nouveau Journal
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
