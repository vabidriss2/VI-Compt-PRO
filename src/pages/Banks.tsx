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
import { Plus, Trash2, Edit2, Landmark, CreditCard, Search, Info, Building2, Wallet, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Banks() {
  const { userData } = useAuth();
  const [banks, setBanks] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [newBank, setNewBank] = useState({
    name: '',
    iban: '',
    bic: '',
    accountNumber: '',
    currency: 'XAF',
    journalId: ''
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/banks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/banks`);
    });

    const qJournals = query(collection(db, `companies/${userData.companyId}/journals`));
    const unsubscribeJournals = onSnapshot(qJournals, (snapshot) => {
      setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`);
    });

    return () => {
      unsubscribe();
      unsubscribeJournals();
    };
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
      setNewBank({ name: '', iban: '', bic: '', accountNumber: '', currency: 'XAF', journalId: '' });
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

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.iban.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banques & Trésorerie</h1>
          <p className="text-muted-foreground">Gérez les comptes bancaires et les journaux de trésorerie associés.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau Compte
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Ajouter un compte bancaire</DialogTitle>
              <DialogDescription>Enregistrez les coordonnées bancaires et liez-les à un journal.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de la Banque</Label>
                  <Input 
                    id="name" 
                    placeholder="ex: Société Générale"
                    value={newBank.name}
                    onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journal">Journal Associé</Label>
                  <Select value={newBank.journalId} onValueChange={(v) => setNewBank({...newBank, journalId: v})}>
                    <SelectTrigger id="journal">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {journals.filter(j => j.type === 'bank' || j.type === 'cash').map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.code} - {j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input 
                  id="iban" 
                  placeholder="FR76 ..."
                  value={newBank.iban}
                  onChange={(e) => setNewBank({...newBank, iban: e.target.value.toUpperCase()})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bic">BIC / SWIFT</Label>
                  <Input 
                    id="bic" 
                    placeholder="SOGEFR ..."
                    value={newBank.bic}
                    onChange={(e) => setNewBank({...newBank, bic: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">N° Compte</Label>
                  <Input 
                    id="accountNumber" 
                    placeholder="123456789"
                    value={newBank.accountNumber}
                    onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddBank}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Comptes Bancaires</CardTitle>
              <CardDescription>Liste des comptes bancaires configurés pour l'entreprise.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher une banque..." 
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
                <TableHead>Banque & Coordonnées</TableHead>
                <TableHead>IBAN / BIC</TableHead>
                <TableHead>Journal Lié</TableHead>
                <TableHead>Devise</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBanks.length > 0 ? (
                filteredBanks.map((bank) => (
                  <TableRow key={bank.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          <Landmark size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{bank.name}</span>
                          <span className="text-[10px] text-muted-foreground">Compte: {bank.accountNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[11px] font-medium">{bank.iban}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{bank.bic || 'Pas de BIC'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bank.journalId ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {journals.find(j => j.id === bank.journalId)?.code}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                            {journals.find(j => j.id === bank.journalId)?.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Non lié</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-muted/50">{bank.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted rounded-full">
                        <Building2 size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">Aucun compte bancaire trouvé</p>
                        <p className="text-sm">Enregistrez vos comptes pour faciliter le rapprochement bancaire.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsAddOpen(true)} className="mt-2">
                        <Plus size={14} className="mr-2" /> Nouveau Compte
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
