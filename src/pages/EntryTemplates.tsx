import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';

export default function EntryTemplates() {
  const { userData } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!userData?.companyId) return;
    const q = query(collection(db, `companies/${userData.companyId}/entry_templates`));
    return onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [userData]);

  const handleAdd = async () => {
    if (!name) return;
    try {
      const newTemplate = { name, description, createdAt: new Date().toISOString() };
      await addDoc(collection(db, `companies/${userData!.companyId}/entry_templates`), newTemplate);
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'entry_templates', null, newTemplate);
      toast.success("Modèle ajouté");
      setIsAddOpen(false);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `companies/${userData!.companyId}/entry_templates`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'entry_templates', id, {});
      toast.success("Modèle supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modèles de Saisie</h1>
          <p className="text-muted-foreground">Automatisez vos écritures répétitives.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus size={18} /> Nouveau Modèle</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un modèle</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du modèle</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Loyer Mensuel" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description optionnelle" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAdd}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon"><Edit size={16} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 size={16} className="text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    Aucun modèle défini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
