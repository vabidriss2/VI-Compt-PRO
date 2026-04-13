import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, where, serverTimestamp } from 'firebase/firestore';
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
import { Plus, Download, FileText, Search, Filter, Trash2, Printer, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sendEmailSimulation } from '../services/emailService';

export default function Invoices() {
  const { userData, company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateInvoiceNumber = (t: 'sale' | 'purchase') => {
    const prefix = t === 'sale' ? 'FAC' : 'ACH';
    return `${prefix}-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  };

  // New Invoice State
  const [type, setType] = useState<'sale' | 'purchase'>('sale');
  const [contactId, setContactId] = useState('');
  const [taxId, setTaxId] = useState('');
  const [number, setNumber] = useState(generateInvoiceNumber('sale'));
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const qInvoices = query(
      collection(db, `companies/${userData.companyId}/invoices`),
      orderBy('date', 'desc')
    );
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
    });

    const qContacts = query(collection(db, `companies/${userData.companyId}/contacts`));
    const unsubscribeContacts = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/contacts`);
    });

    const qTaxes = query(collection(db, `companies/${userData.companyId}/taxes`), where('isActive', '==', true));
    const unsubscribeTaxes = onSnapshot(qTaxes, (snapshot) => {
      setTaxes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/taxes`);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeContacts();
      unsubscribeTaxes();
    };
  }, [userData]);

  const addItem = () => setItems([...items, { description: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const selectedTax = taxes.find(t => t.id === taxId);
  const taxRate = selectedTax ? selectedTax.rate / 100 : 0;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  const handleSaveInvoice = async () => {
    if (!contactId || !number || items.some(i => !i.description)) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const path = `companies/${userData.companyId}/invoices`;
      await addDoc(collection(db, path), {
        type,
        contactId,
        taxId,
        taxRate: selectedTax?.rate || 0,
        number,
        date,
        dueDate,
        items,
        subtotal,
        taxAmount,
        totalAmount,
        status: 'pending',
        companyId: userData.companyId,
        createdAt: new Date().toISOString()
      });

      toast.success("Facture enregistrée !");
      setIsAddOpen(false);
      resetForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/invoices`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContactId('');
    setNumber(generateInvoiceNumber(type));
    setItems([{ description: '', quantity: 1, price: 0 }]);
  };

  const handleSendReminder = async (invoice: any) => {
    try {
      const title = `Relance Facture ${invoice.number}`;
      const message = `Rappel : La facture ${invoice.number} d'un montant de ${invoice.totalAmount.toLocaleString()} ${company?.currency} est en attente de règlement.`;
      
      await addDoc(collection(db, `companies/${userData!.companyId}/notifications`), {
        type: 'payment_reminder',
        title,
        message,
        status: 'unread',
        createdAt: serverTimestamp(),
        invoiceId: invoice.id,
        companyId: userData!.companyId
      });

      await sendEmailSimulation(
        userData!.companyId,
        'client@example.com',
        title,
        message,
        'invoice_reminder'
      );

      toast.success("Relance envoyée !");
    } catch (error: any) {
      toast.error("Erreur lors de l'envoi de la relance");
    }
  };

  const generatePDF = (invoice: any) => {
    const doc = new jsPDF();
    const contact = contacts.find(c => c.id === invoice.contactId);

    // Header
    doc.setFontSize(20);
    doc.text(company?.name || 'VI Compt PRO', 14, 22);
    doc.setFontSize(10);
    doc.text(`Facture N°: ${invoice.number}`, 14, 30);
    doc.text(`Date: ${invoice.date}`, 14, 35);
    doc.text(`Échéance: ${invoice.dueDate}`, 14, 40);

    // Client Info
    doc.setFontSize(12);
    doc.text('Destinataire:', 14, 55);
    doc.setFontSize(10);
    doc.text(contact?.name || 'Client inconnu', 14, 60);
    doc.text(contact?.address || '', 14, 65);
    doc.text(contact?.email || '', 14, 70);

    // Table
    const tableData = invoice.items.map((item: any) => [
      item.description,
      item.quantity,
      item.price.toLocaleString(),
      (item.quantity * item.price).toLocaleString()
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [['Description', 'Qté', 'Prix Unitaire', 'Total']],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.text(`Sous-total: ${invoice.subtotal.toLocaleString()} ${company?.currency}`, 140, finalY + 10);
    doc.text(`Taxe (${invoice.taxRate || 0}%): ${invoice.taxAmount.toLocaleString()} ${company?.currency}`, 140, finalY + 15);
    doc.setFontSize(12);
    doc.text(`TOTAL: ${invoice.totalAmount.toLocaleString()} ${company?.currency}`, 140, finalY + 25);

    doc.save(`Facture_${invoice.number}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
          <p className="text-muted-foreground">Gérez vos factures clients et vos factures fournisseurs.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="gap-2">
              <Plus size={18} />
              Nouvelle Facture
            </Button>
          } />
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Créer une facture</DialogTitle>
              <DialogDescription>Saisissez les détails de la nouvelle facture.</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v: any) => {
                    setType(v);
                    setNumber(generateInvoiceNumber(v));
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Vente (Client)</SelectItem>
                      <SelectItem value="purchase">Achat (Fournisseur)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Numéro</Label>
                  <Input placeholder="ex: FAC-2024-001" value={number} onChange={(e) => setNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Échéance</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact ({type === 'sale' ? 'Client' : 'Fournisseur'})</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.filter(c => c.type === (type === 'sale' ? 'customer' : 'supplier')).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Taxe / TVA</Label>
                  <Select value={taxId} onValueChange={setTaxId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une taxe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune (0%)</SelectItem>
                      {taxes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-12 gap-2 font-semibold text-sm px-2">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Quantité</div>
                  <div className="col-span-2 text-right">Prix Unit.</div>
                  <div className="col-span-2"></div>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <Input 
                        placeholder="Description de l'article" 
                        value={item.description} 
                        onChange={(e) => updateItem(index, 'description', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        className="text-right" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))} 
                      />
                    </div>
                    <div className="col-span-2">
                      <Input 
                        type="number" 
                        className="text-right" 
                        value={item.price} 
                        onChange={(e) => updateItem(index, 'price', Number(e.target.value))} 
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                        <Trash2 size={16} className="text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} className="mr-2" /> Ajouter une ligne
                </Button>
              </div>

              <div className="flex justify-end border-t pt-4">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total:</span>
                    <span className="font-semibold">{subtotal.toLocaleString()} {company?.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Taxe ({selectedTax?.rate || 0}%):</span>
                    <span className="font-semibold">{taxAmount.toLocaleString()} {company?.currency}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>TOTAL:</span>
                    <span className="text-primary">{totalAmount.toLocaleString()} {company?.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveInvoice} disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer la facture"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des factures</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-10" />
              </div>
              <Button variant="outline" size="icon"><Filter size={18} /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map((inv) => {
                  const contact = contacts.find(c => c.id === inv.contactId);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{contact?.name || 'Inconnu'}</span>
                          <span className="text-xs text-muted-foreground capitalize">{inv.type === 'sale' ? 'Client' : 'Fournisseur'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(inv.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(inv.dueDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right font-bold">
                        {inv.totalAmount.toLocaleString()} {company?.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>
                          {inv.status === 'paid' ? 'Payé' : 'En attente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Envoyer une relance"
                            onClick={() => handleSendReminder(inv)}
                            disabled={inv.status === 'paid'}
                          >
                            <Send size={16} className="text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => generatePDF(inv)}>
                            <Printer size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => generatePDF(inv)}>
                            <Download size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Aucune facture enregistrée.</p>
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
