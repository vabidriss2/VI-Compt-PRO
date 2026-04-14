import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
import { Plus, Search, User, Mail, Phone, MapPin, Trash2, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Contacts() {
  const { userData } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [newContact, setNewContact] = useState({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(collection(db, `companies/${userData.companyId}/contacts`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/contacts`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleAddContact = async () => {
    if (!newContact.name) {
      toast.error("Le nom est obligatoire.");
      return;
    }

    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/contacts`;
      await addDoc(collection(db, path), {
        ...newContact,
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });
      toast.success("Contact ajouté !");
      setIsAddOpen(false);
      setNewContact({ name: '', type: 'customer', email: '', phone: '', address: '' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/contacts`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact.name || !userData?.companyId) return;
    
    setLoading(true);
    try {
      const contactRef = doc(db, `companies/${userData.companyId}/contacts`, editingContact.id);
      const { id, ...updateData } = editingContact;
      await updateDoc(contactRef, updateData);
      toast.success("Contact mis à jour !");
      setIsEditOpen(false);
      setEditingContact(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${userData.companyId}/contacts/${editingContact.id}`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm("Supprimer ce contact ?")) return;
    
    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/contacts`, id));
      toast.success("Contact supprimé !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${userData.companyId}/contacts/${id}`);
      toast.error("Erreur : " + error.message);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Gérez vos clients et vos fournisseurs.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouveau Contact
            </Button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un contact</DialogTitle>
              <DialogDescription>Enregistrez un nouveau client ou fournisseur.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom</Label>
                <Input 
                  id="name" 
                  className="col-span-3" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Select 
                  value={newContact.type} 
                  onValueChange={(v) => setNewContact({...newContact, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Client</SelectItem>
                    <SelectItem value="supplier">Fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  className="col-span-3" 
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Téléphone</Label>
                <Input 
                  id="phone" 
                  className="col-span-3" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Adresse</Label>
                <Input 
                  id="address" 
                  className="col-span-3" 
                  value={newContact.address}
                  onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAddContact}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des contacts</CardTitle>
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
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {contact.name[0]}
                        </div>
                        {contact.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contact.type === 'customer' ? 'default' : 'secondary'}>
                        {contact.type === 'customer' ? 'Client' : 'Fournisseur'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={12} /> {contact.email || '-'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone size={12} /> {contact.phone || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} className="text-muted-foreground" />
                        {contact.address || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingContact(contact);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteContact(contact.id)}
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
                    Aucun contact trouvé.
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
            <DialogTitle>Modifier le contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nom</Label>
                <Input 
                  id="edit-name" 
                  className="col-span-3" 
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">Type</Label>
                <Select 
                  value={editingContact.type} 
                  onValueChange={(v) => setEditingContact({...editingContact, type: v})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Client</SelectItem>
                    <SelectItem value="supplier">Fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">Email</Label>
                <Input 
                  id="edit-email" 
                  type="email"
                  className="col-span-3" 
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">Téléphone</Label>
                <Input 
                  id="edit-phone" 
                  className="col-span-3" 
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-address" className="text-right">Adresse</Label>
                <Input 
                  id="edit-address" 
                  className="col-span-3" 
                  value={editingContact.address}
                  onChange={(e) => setEditingContact({...editingContact, address: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateContact} disabled={loading}>
              {loading ? "Mise à jour..." : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
