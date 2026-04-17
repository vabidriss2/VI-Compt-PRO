import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, where } from 'firebase/firestore';
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
import { Plus, Search, User, Mail, Phone, MapPin, Trash2, Edit2, Building2, CreditCard, FileText, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export default function Contacts() {
  const { userData, company } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [newContact, setNewContact] = useState({
    name: '',
    type: 'customer',
    email: '',
    phone: '',
    address: '',
    taxId: '',
    currency: company?.currency || 'EUR',
    status: 'active'
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const qContacts = query(collection(db, `companies/${userData.companyId}/contacts`));
    const unsubscribeContacts = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/contacts`);
    });

    const qInvoices = query(collection(db, `companies/${userData.companyId}/invoices`));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
    });

    return () => {
      unsubscribeContacts();
      unsubscribeInvoices();
    };
  }, [userData]);

  const calculateBalance = (contactId: string) => {
    const contactInvoices = invoices.filter(inv => inv.contactId === contactId);
    const total = contactInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paid = contactInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    return { total, paid, balance: total - paid };
  };

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
      setNewContact({ name: '', type: 'customer', email: '', phone: '', address: '', taxId: '', currency: company?.currency || 'EUR', status: 'active' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/contacts`);
      toast.error("Erreur lors de l'ajout");
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
      toast.error("Erreur lors de la mise à jour");
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
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.taxId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: contacts.length,
    customers: contacts.filter(c => c.type === 'customer').length,
    suppliers: contacts.filter(c => c.type === 'supplier').length,
    totalBalance: contacts.reduce((sum, c) => sum + calculateBalance(c.id).balance, 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tiers & Contacts</h1>
          <p className="text-muted-foreground">Gérez vos relations commerciales et suivez les encours clients/fournisseurs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter size={18} /> Filtres Avancés
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="gap-2">
              <Plus size={18} /> Nouveau Contact
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un nouveau tiers</DialogTitle>
                <DialogDescription>Remplissez les informations d'identification et de facturation du contact.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nom / Raison Sociale</Label>
                  <Input 
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                    placeholder="ex: Entreprise SARL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de tiers</Label>
                  <Select 
                    value={newContact.type} 
                    onValueChange={(v) => setNewContact({...newContact, type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Client</SelectItem>
                      <SelectItem value="supplier">Fournisseur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Identifiant Fiscal (SIRET/TVA)</Label>
                  <Input 
                    value={newContact.taxId}
                    onChange={(e) => setNewContact({...newContact, taxId: e.target.value})}
                    placeholder="ex: FR 12 345 678 901"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Devise par défaut</Label>
                  <Input 
                    value={newContact.currency}
                    onChange={(e) => setNewContact({...newContact, currency: e.target.value})}
                    placeholder="ex: EUR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    placeholder="contact@exemple.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input 
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Adresse complète</Label>
                  <Input 
                    value={newContact.address}
                    onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                    placeholder="123 Rue de la Paix, 75000 Paris"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                <Button onClick={handleAddContact} disabled={loading}>
                  {loading ? "Création..." : "Enregistrer le contact"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Total Tiers</p>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <User size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Clients</p>
                <h3 className="text-2xl font-bold text-emerald-600">{stats.customers}</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                <ArrowDownRight size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Fournisseurs</p>
                <h3 className="text-2xl font-bold text-rose-600">{stats.suppliers}</h3>
              </div>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-600">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground">Encours Global</p>
                <h3 className="text-2xl font-bold text-amber-600">{stats.totalBalance.toLocaleString()} {company?.currency}</h3>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                <CreditCard size={20} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={filterType} onValueChange={setFilterType} className="w-fit">
              <TabsList>
                <TabsTrigger value="all">Tous</TabsTrigger>
                <TabsTrigger value="customer">Clients</TabsTrigger>
                <TabsTrigger value="supplier">Fournisseurs</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par nom, email, SIRET..." 
                className="pl-10 h-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Tiers</TableHead>
                <TableHead>Identifiant Fiscal</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Total Facturé</TableHead>
                <TableHead className="text-right">Encours</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => {
                  const { total, balance } = calculateBalance(contact.id);
                  return (
                    <TableRow key={contact.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                            contact.type === 'customer' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {contact.name[0]}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{contact.name}</span>
                            <Badge variant="outline" className="w-fit text-[9px] h-4 px-1 mt-1 uppercase">
                              {contact.type === 'customer' ? 'Client' : 'Fournisseur'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          <Building2 size={12} />
                          {contact.taxId || "Non renseigné"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail size={12} /> {contact.email || '-'}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone size={12} /> {contact.phone || '-'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {total.toLocaleString()} {contact.currency}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-bold font-mono text-xs",
                          balance > 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {balance.toLocaleString()} {contact.currency}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info("Détails du compte tiers bientôt disponible")}>
                            <FileText size={14} />
                          </Button>
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
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteContact(contact.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">
                    Aucun tiers ne correspond à votre recherche.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier les informations du tiers</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom / Raison Sociale</Label>
                <Input 
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({...editingContact, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={editingContact.type} 
                  onValueChange={(v) => setEditingContact({...editingContact, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Client</SelectItem>
                    <SelectItem value="supplier">Fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Identifiant Fiscal</Label>
                <Input 
                  value={editingContact.taxId}
                  onChange={(e) => setEditingContact({...editingContact, taxId: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select 
                  value={editingContact.status} 
                  onValueChange={(v) => setEditingContact({...editingContact, status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({...editingContact, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input 
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({...editingContact, phone: e.target.value})}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input 
                  value={editingContact.address}
                  onChange={(e) => setEditingContact({...editingContact, address: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateContact} disabled={loading}>
              {loading ? "Mise à jour..." : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
