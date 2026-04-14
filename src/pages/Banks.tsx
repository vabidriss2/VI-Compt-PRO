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
import { Plus, Trash2, Edit2, Landmark, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

export default function Banks() {
  const { userData } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [newBank, setNewBank] = useState({
    name: '',
    iban: '',
    bic: '',
    accountNumber: '',
    currency: 'XAF'
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/banks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/banks`);
    });

    return () => unsubscribe();
  }, [userData]);

  const validateIBAN = (iban: string) => {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  };

  const validateBIC = (bic: string) => {
    const bicRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return bicRegex.test(bic.replace(/\s/g, ''));
  };

  const handleAddBank = async () => {
    if (!newBank.name || !newBank.iban) {
      toast.error("Le nom et l'IBAN sont obligatoires.");
      return;
    }

    if (!validateIBAN(newBank.iban)) {
      toast.error("Format d'IBAN invalide.");
      return;
    }

    if (newBank.bic && !validateBIC(newBank.bic)) {
      toast.error("Format de BIC invalide.");
      return;
    }

    try {
      const path = `companies/${userData.companyId}/banks`;
      await addDoc(collection(db, path), {
        ...newBank,
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'banks', null, newBank);
      
      toast.success("Compte bancaire ajouté !");
      setIsAddOpen(false);
      setNewBank({ name: '', iban: '', bic: '', accountNumber: '', currency: 'XAF' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/banks`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleUpdateBank = async () => {
    if (!editingBank.name || !editingBank.iban) {
      toast.error("Le nom et l'IBAN sont obligatoires.");
      return;
    }

    if (!validateIBAN(editingBank.iban)) {
      toast.error("Format d'IBAN invalide.");
      return;
    }

    if (editingBank.bic && !validateBIC(editingBank.bic)) {
      toast.error("Format de BIC invalide.");
      return;
    }

    try {
      const bankRef = doc(db, `companies/${userData.companyId}/banks`, editingBank.id);
      const { id, ...updateData } = editingBank;
      await updateDoc(bankRef, updateData);
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'banks', editingBank.id, updateData);
      
      toast.success("Compte bancaire mis à jour !");
      setIsEditOpen(false);
      setEditingBank(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/banks`);
      toast.error("Erreur : " + error.message);
    }
  };

  const handleDeleteBank = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte bancaire ?")) return;

    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/banks`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'banks', id, null);
      toast.success("Compte bancaire supprimé !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/banks`);
      toast.error("Erreur : " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banques</h1>
          <p className="text-muted-foreground">Gérez les comptes bancaires de votre entreprise.</p>
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
              <DialogTitle>Ajouter un compte bancaire</DialogTitle>
              <DialogDescription>Enregistrez les coordonnées bancaires de l'entreprise.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom Banque</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  placeholder="ex: Société Générale"
                  value={newBank.name}
                  onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iban" className="text-right">IBAN</Label>
                <Input 
                  id="iban" 
                  className="col-span-3" 
                  placeholder="FR76 ..."
                  value={newBank.iban}
                  onChange={(e) => setNewBank({...newBank, iban: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bic" className="text-right">BIC / SWIFT</Label>
                <Input 
                  id="bic" 
                  className="col-span-3" 
                  placeholder="SOGEFR ..."
                  value={newBank.bic}
                  onChange={(e) => setNewBank({...newBank, bic: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accountNumber" className="text-right">N° Compte</Label>
                <Input 
                  id="accountNumber" 
                  className="col-span-3" 
                  value={newBank.accountNumber}
                  onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddBank}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comptes Bancaires</CardTitle>
          <CardDescription>Liste des comptes bancaires configurés.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banque</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>BIC</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.length > 0 ? (
                banks.map((bank) => (
                  <TableRow key={bank.id} className="group">
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-primary" />
                        {bank.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{bank.iban}</TableCell>
                    <TableCell className="font-mono text-xs">{bank.bic || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bank.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingBank(bank);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteBank(bank.id)}
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
                    Aucun compte bancaire configuré.
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
            <DialogTitle>Modifier le compte bancaire</DialogTitle>
          </DialogHeader>
          {editingBank && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom Banque</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingBank.name}
                  onChange={(e) => setEditingBank({...editingBank, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-iban" className="text-right">IBAN</Label>
                <Input 
                  id="edit-iban" 
                  className="col-span-3" 
                  value={editingBank.iban}
                  onChange={(e) => setEditingBank({...editingBank, iban: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-bic" className="text-right">BIC / SWIFT</Label>
                <Input 
                  id="edit-bic" 
                  className="col-span-3" 
                  value={editingBank.bic}
                  onChange={(e) => setEditingBank({...editingBank, bic: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-accountNumber" className="text-right">N° Compte</Label>
                <Input 
                  id="edit-accountNumber" 
                  className="col-span-3" 
                  value={editingBank.accountNumber}
                  onChange={(e) => setEditingBank({...editingBank, accountNumber: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateBank}>Mettre à jour</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
