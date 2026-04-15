import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, History, AlertTriangle, MessageSquare, Clock, Search, Filter, CheckCircle2, Mail, Bell, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmailSimulation } from '../services/emailService';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export default function Reminders() {
  const { userData, company } = useAuth();
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;
    
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, `companies/${userData.companyId}/invoices`),
      where('status', '==', 'pending'),
      where('type', '==', 'sale'),
      where('dueDate', '<', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOverdueInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
    });

    const qContacts = query(collection(db, `companies/${userData.companyId}/contacts`));
    const unsubscribeContacts = onSnapshot(qContacts, (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/contacts`);
    });

    return () => {
      unsubscribe();
      unsubscribeContacts();
    };
  }, [userData]);

  const handleSendReminder = async (invoice: any) => {
    try {
      const contact = contacts.find(c => c.id === invoice.contactId);
      const daysLate = differenceInDays(new Date(), parseISO(invoice.dueDate));
      
      const title = `Relance : Facture ${invoice.number} en retard`;
      const message = `Bonjour ${contact?.name || 'Client'},\n\nSauf erreur de notre part, la facture ${invoice.number} d'un montant de ${invoice.totalAmount.toLocaleString()} ${company?.currency} est en retard de ${daysLate} jours.\n\nMerci de procéder au règlement dans les plus brefs délais.`;

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
        contact?.email || 'client@example.com',
        title,
        message,
        'invoice_reminder'
      );

      // Update invoice with reminder count
      const invoiceRef = doc(db, `companies/${userData!.companyId}/invoices`, invoice.id);
      await updateDoc(invoiceRef, {
        reminderCount: (invoice.reminderCount || 0) + 1,
        lastReminderDate: new Date().toISOString()
      });

      toast.success(`Relance envoyée à ${contact?.name || 'Client'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData!.companyId}/notifications`);
      toast.error("Erreur lors de l'envoi de la relance");
    }
  };

  const handleBulkReminder = async () => {
    if (selectedInvoices.length === 0) return;
    
    setIsSendingBulk(true);
    let successCount = 0;
    
    try {
      for (const id of selectedInvoices) {
        const invoice = overdueInvoices.find(inv => inv.id === id);
        if (invoice) {
          await handleSendReminder(invoice);
          successCount++;
        }
      }
      toast.success(`${successCount} relances envoyées avec succès.`);
      setSelectedInvoices([]);
    } catch (error) {
      toast.error("Une erreur est survenue lors de l'envoi groupé.");
    } finally {
      setIsSendingBulk(false);
    }
  };

  const filteredInvoices = overdueInvoices.filter(inv => {
    const contact = contacts.find(c => c.id === inv.contactId);
    return inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getReminderLevel = (count: number) => {
    if (!count || count === 0) return { label: 'Aucune', color: 'bg-slate-100 text-slate-600' };
    if (count === 1) return { label: '1ère Relance', color: 'bg-amber-100 text-amber-600' };
    if (count === 2) return { label: '2ème Relance', color: 'bg-orange-100 text-orange-600' };
    return { label: 'Mise en demeure', color: 'bg-rose-100 text-rose-600 font-bold' };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relances Clients</h1>
          <p className="text-muted-foreground">Gérez vos factures impayées et automatisez le suivi des règlements.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="default" 
            className="gap-2" 
            disabled={selectedInvoices.length === 0 || isSendingBulk}
            onClick={handleBulkReminder}
          >
            <Send size={16} />
            {isSendingBulk ? "Envoi..." : `Relancer la sélection (${selectedInvoices.length})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-rose-50 border-rose-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Factures en retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">{overdueInvoices.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Impayé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {overdueInvoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Délai Moyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {overdueInvoices.length > 0 
                ? Math.round(overdueInvoices.reduce((sum, i) => sum + differenceInDays(new Date(), parseISO(i.dueDate)), 0) / overdueInvoices.length)
                : 0} j
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Relances ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">12</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="text-rose-500" size={20} />
              Détail des retards de paiement
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher une facture ou un client..." 
                className="pl-9 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedInvoices(filteredInvoices.map(i => i.id));
                      else setSelectedInvoices([]);
                    }}
                  />
                </TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead>Niveau Relance</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map(inv => {
                const contact = contacts.find(c => c.id === inv.contactId);
                const daysLate = differenceInDays(new Date(), parseISO(inv.dueDate));
                const reminderLevel = getReminderLevel(inv.reminderCount || 0);
                
                return (
                  <TableRow key={inv.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Checkbox 
                        checked={selectedInvoices.includes(inv.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedInvoices([...selectedInvoices, inv.id]);
                          else setSelectedInvoices(selectedInvoices.filter(id => id !== inv.id));
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">{inv.number}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{contact?.name || 'Inconnu'}</span>
                        <span className="text-[10px] text-muted-foreground">{contact?.email || 'Pas d\'email'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(parseISO(inv.dueDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                        <Clock size={10} />
                        {daysLate} jours
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] border-transparent", reminderLevel.color)}>
                        {reminderLevel.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      {inv.totalAmount.toLocaleString()} {company?.currency}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleSendReminder(inv)}>
                          <Send size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Historique">
                          <History size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="p-4 bg-muted rounded-full text-emerald-500">
                        <CheckCircle2 size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">Aucun retard de paiement</p>
                        <p className="text-sm">Félicitations ! Votre trésorerie est saine et vos clients sont à jour.</p>
                      </div>
                    </div>
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
