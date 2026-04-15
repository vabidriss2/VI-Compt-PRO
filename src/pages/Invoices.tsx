import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, orderBy, where, serverTimestamp, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
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
import { 
  Plus, 
  Download, 
  FileText, 
  Search, 
  Filter, 
  Trash2, 
  Printer, 
  Send, 
  RefreshCw,
  CheckSquare,
  Square,
  Mail,
  MoreVertical,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendEmailSimulation } from '../services/emailService';

export default function Invoices() {
  const { userData, company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
  const [items, setItems] = useState([{ productId: '', description: '', quantity: 1, price: 0 }]);

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

    const qProducts = query(collection(db, `companies/${userData.companyId}/products`));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/products`);
    });

    const qJournals = query(collection(db, `companies/${userData.companyId}/journals`));
    const unsubscribeJournals = onSnapshot(qJournals, (snapshot) => {
      setJournals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journals`);
    });

    const qAccounts = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
      const accs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(accs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeContacts();
      unsubscribeTaxes();
      unsubscribeProducts();
      unsubscribeJournals();
      unsubscribeAccounts();
    };
  }, [userData]);

  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const addItem = () => setItems([...items, { productId: '', description: '', quantity: 1, price: 0 }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    
    // If product selected, auto-fill price and description
    if (field === 'productId' && value !== 'manual') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].description = product.name;
        newItems[index].price = type === 'sale' ? product.price : product.costPrice;
      }
    }
    
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
    const batch = writeBatch(db);
    try {
      const companyId = userData!.companyId;
      const invoicePath = `companies/${companyId}/invoices`;
      const invoiceData = {
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
        companyId,
        createdAt: new Date().toISOString()
      };

      const invoiceRef = doc(collection(db, invoicePath));
      batch.set(invoiceRef, invoiceData);

      // 1. Update Stock
      for (const item of items) {
        if (item.productId && item.productId !== 'manual') {
          const productRef = doc(db, `companies/${companyId}/products`, item.productId);
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const newStock = type === 'sale' 
              ? product.stockQuantity - item.quantity 
              : product.stockQuantity + item.quantity;
            batch.update(productRef, { stockQuantity: newStock });
          }
        }
      }

      // 2. Automatic Accounting Entry (Synchronization)
      const journalCode = type === 'sale' ? 'VEN' : 'ACH';
      const journal = journals.find(j => j.code === journalCode) || journals.find(j => j.type === type);
      
      if (journal) {
        const txRef = doc(collection(db, `companies/${companyId}/transactions`));
        batch.set(txRef, {
          date,
          journalId: journal.id,
          reference: number,
          description: `Facture ${type === 'sale' ? 'Vente' : 'Achat'} n°${number}`,
          companyId,
          createdBy: userData!.uid,
          createdAt: new Date().toISOString(),
          type: 'invoice',
          invoiceId: invoiceRef.id
        });

        // Find Accounts
        const contact = contacts.find(c => c.id === contactId);
        const contactAccountCode = type === 'sale' ? '411' : '401';
        const revenueAccountCode = '701';
        const expenseAccountCode = '601';
        const taxAccountCode = '445';

        const accContact = accounts.find(a => a.code.startsWith(contactAccountCode));
        const accMain = accounts.find(a => a.code.startsWith(type === 'sale' ? revenueAccountCode : expenseAccountCode));
        const accTax = accounts.find(a => a.code.startsWith(taxAccountCode));

        if (accContact && accMain) {
          // Entry for Contact (Customer/Supplier)
          const entryContactRef = doc(collection(db, `companies/${companyId}/journal_entries`));
          batch.set(entryContactRef, {
            transactionId: txRef.id,
            accountId: accContact.id,
            debit: type === 'sale' ? totalAmount : 0,
            credit: type === 'purchase' ? totalAmount : 0,
            description: `Facture ${number} - ${contact?.name}`,
            companyId,
            date,
            journalId: journal.id
          });

          // Entry for Revenue/Expense
          const entryMainRef = doc(collection(db, `companies/${companyId}/journal_entries`));
          batch.set(entryMainRef, {
            transactionId: txRef.id,
            accountId: accMain.id,
            debit: type === 'purchase' ? subtotal : 0,
            credit: type === 'sale' ? subtotal : 0,
            description: `Facture ${number} - Hors Taxe`,
            companyId,
            date,
            journalId: journal.id
          });

          // Entry for Tax
          if (taxAmount > 0 && accTax) {
            const entryTaxRef = doc(collection(db, `companies/${companyId}/journal_entries`));
            batch.set(entryTaxRef, {
              transactionId: txRef.id,
              accountId: accTax.id,
              debit: type === 'purchase' ? taxAmount : 0,
              credit: type === 'sale' ? taxAmount : 0,
              description: `TVA sur Facture ${number}`,
              companyId,
              date,
              journalId: journal.id
            });
          }
        }
      }

      await batch.commit();

      toast.success("Facture enregistrée, stock mis à jour et comptabilisée !");
      setIsAddOpen(false);
      resetForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData!.companyId}/invoices`);
      toast.error("Erreur : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    try {
      await deleteDoc(doc(db, `companies/${userData.companyId}/invoices`, id));
      toast.success("Facture supprimée.");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${userData.companyId}/invoices/${id}`);
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Marquer ${selectedIds.length} factures comme payées ?`)) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const ref = doc(db, `companies/${userData!.companyId}/invoices`, id);
        batch.update(ref, { status: 'paid', paidAt: new Date().toISOString() });
      });
      await batch.commit();
      toast.success(`${selectedIds.length} factures marquées comme payées.`);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur lors de l'action groupée.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSendReminders = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      let count = 0;
      for (const id of selectedIds) {
        const inv = invoices.find(i => i.id === id);
        if (inv && inv.status !== 'paid') {
          await handleSendReminder(inv);
          count++;
        }
      }
      toast.success(`${count} relances envoyées.`);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Erreur lors de l'envoi des relances.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoice: any) => {
    setLoading(true);
    try {
      const contact = contacts.find(c => c.id === invoice.contactId);
      const title = `Votre facture ${invoice.number}`;
      const message = `Bonjour ${contact?.name},\n\nVeuillez trouver ci-joint votre facture ${invoice.number} d'un montant de ${invoice.totalAmount.toLocaleString()} ${company?.currency}.\n\nCordialement,\n${company?.name}`;
      
      await sendEmailSimulation(
        userData!.companyId,
        contact?.email || 'client@example.com',
        title,
        message,
        'invoice_send'
      );

      const invRef = doc(db, `companies/${userData!.companyId}/invoices`, invoice.id);
      await updateDoc(invRef, { 
        status: invoice.status === 'pending' ? 'sent' : invoice.status,
        sentAt: new Date().toISOString() 
      });

      toast.success(`Facture ${invoice.number} envoyée avec succès !`);
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la facture.");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (invoice: any) => {
    const doc = new jsPDF();
    const contact = contacts.find(c => c.id === invoice.contactId);

    // Header & Logo Placeholder
    doc.setFillColor(5, 150, 105); // Emerald 600
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(company?.name || 'VI Compt PRO', 14, 25);
    
    doc.setFontSize(10);
    doc.text(company?.address || 'Adresse de l\'entreprise', 14, 32);
    doc.text(`NIF: ${company?.taxId || 'N/A'}`, 14, 37);

    // Invoice Info Box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text('FACTURE', 140, 55);
    doc.setFontSize(10);
    doc.text(`Numéro: ${invoice.number}`, 140, 62);
    doc.text(`Date: ${format(new Date(invoice.date), 'dd/MM/yyyy')}`, 140, 67);
    doc.text(`Échéance: ${format(new Date(invoice.dueDate), 'dd/MM/yyyy')}`, 140, 72);

    // Client Info
    doc.setFontSize(12);
    doc.text('DESTINATAIRE', 14, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(contact?.name || 'Client inconnu', 14, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(contact?.address || 'Pas d\'adresse renseignée', 14, 67);
    doc.text(contact?.phone || '', 14, 72);
    doc.text(contact?.email || '', 14, 77);

    // Table
    const tableData = invoice.items.map((item: any) => [
      item.description,
      item.quantity,
      `${item.price.toLocaleString()} ${company?.currency}`,
      `${(item.quantity * item.price).toLocaleString()} ${company?.currency}`
    ]);

    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Qté', 'Prix Unitaire', 'Total HT']],
      body: tableData,
      headStyles: { fillColor: [5, 150, 105] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    // Totals
    doc.setFontSize(10);
    const totalX = 140;
    doc.text(`Sous-total HT:`, totalX, finalY + 15);
    doc.text(`${invoice.subtotal.toLocaleString()} ${company?.currency}`, 180, finalY + 15, { align: 'right' });
    
    doc.text(`TVA (${invoice.taxRate || 0}%):`, totalX, finalY + 22);
    doc.text(`${invoice.taxAmount.toLocaleString()} ${company?.currency}`, 180, finalY + 22, { align: 'right' });
    
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.5);
    doc.line(totalX, finalY + 26, 190, finalY + 26);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL TTC:`, totalX, finalY + 35);
    doc.text(`${invoice.totalAmount.toLocaleString()} ${company?.currency}`, 180, finalY + 35, { align: 'right' });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Merci de votre confiance.', 105, 285, { align: 'center' });
    doc.text(`${company?.name} - Généré par VI Compt PRO`, 105, 290, { align: 'center' });

    doc.save(`Facture_${invoice.number}.pdf`);
  };

  const filteredInvoices = invoices.filter(inv => {
    const contact = contacts.find(c => c.id === inv.contactId);
    const matchesSearch = inv.number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.items.some((i: any) => i.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesType = filterType === 'all' || inv.type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const resetForm = () => {
    setContactId('');
    setNumber(generateInvoiceNumber(type));
    setItems([{ productId: '', description: '', quantity: 1, price: 0 }]);
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
                  <div className="col-span-4">Article / Produit</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1.5 text-right">Qté</div>
                  <div className="col-span-2 text-right">Prix Unit.</div>
                  <div className="col-span-1.5"></div>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg transition-all hover:bg-muted/30 hover:shadow-sm group">
                    <div className="col-span-4">
                      <Select value={item.productId} onValueChange={(v) => updateItem(index, 'productId', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Saisie manuelle</SelectItem>
                          {products.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.code} - {p.name} ({p.stockQuantity} en stock)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input 
                        placeholder="Description" 
                        value={item.description} 
                        onChange={(e) => updateItem(index, 'description', e.target.value)} 
                      />
                    </div>
                    <div className="col-span-1.5">
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
                    <div className="col-span-1.5 flex justify-end">
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
              <Button onClick={handleSaveInvoice} disabled={loading} className="gap-2">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Synchronisation..." : "Sauvegarder & Synchroniser"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>Liste des factures</CardTitle>
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                  <Badge variant="secondary" className="px-2 py-1">{selectedIds.length} sélectionnés</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="outline" size="sm" className="gap-2">
                        Actions groupées <ChevronDown size={14} />
                      </Button>
                    } />
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleBulkMarkAsPaid} className="gap-2">
                        <CheckSquare size={14} className="text-emerald-500" /> Marquer comme payé
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBulkSendReminders} className="gap-2">
                        <Mail size={14} className="text-blue-500" /> Envoyer des relances
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive gap-2">
                        <Trash2 size={14} /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher (N°, Contact, Article)..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  <SelectItem value="sale">Ventes</SelectItem>
                  <SelectItem value="purchase">Achats</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={toggleSelectAll}
                  >
                    {selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0 ? (
                      <CheckSquare size={18} className="text-primary" />
                    ) : (
                      <Square size={18} className="text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
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
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => {
                  const contact = contacts.find(c => c.id === inv.contactId);
                  const isSelected = selectedIds.includes(inv.id);
                  const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== 'paid';

                  return (
                    <TableRow key={inv.id} className={cn("group transition-colors", isSelected && "bg-muted/50")}>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => toggleSelect(inv.id)}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} className="text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {inv.number}
                          {isOverdue && <AlertCircle size={14} className="text-rose-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{contact?.name || 'Inconnu'}</span>
                          <span className="text-xs text-muted-foreground capitalize">{inv.type === 'sale' ? 'Client' : 'Fournisseur'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(inv.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className={cn(isOverdue && "text-rose-600 font-medium")}>
                        {format(new Date(inv.dueDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {inv.totalAmount.toLocaleString()} {company?.currency}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={inv.type === 'sale' ? 'default' : 'outline'} className={cn("w-fit text-[10px] uppercase", inv.type === 'sale' ? "bg-blue-500 hover:bg-blue-600" : "border-amber-500 text-amber-600")}>
                            {inv.type === 'sale' ? 'Vente' : 'Achat'}
                          </Badge>
                          <Badge variant={inv.status === 'paid' ? 'secondary' : 'outline'} className={cn(
                            "w-fit text-[10px] uppercase", 
                            inv.status === 'paid' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : 
                            inv.status === 'sent' ? "bg-blue-50 text-blue-600 border-blue-100" :
                            isOverdue ? "bg-rose-50 text-rose-600 border-rose-100" :
                            "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                            {inv.status === 'paid' ? 'Payé' : inv.status === 'sent' ? 'Envoyé' : isOverdue ? 'En retard' : 'En attente'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Envoyer la facture par email"
                            onClick={() => handleSendInvoice(inv)}
                            disabled={inv.status === 'paid'}
                          >
                            <Mail size={14} className="text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Envoyer une relance"
                            onClick={() => handleSendReminder(inv)}
                            disabled={inv.status === 'paid'}
                          >
                            <Send size={14} className="text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            title="Imprimer / Voir PDF"
                            onClick={() => generatePDF(inv)}
                          >
                            <Printer size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                            onClick={() => handleDeleteInvoice(inv.id)}
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
