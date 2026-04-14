import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, History, AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmailSimulation } from '../services/emailService';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Reminders() {
  const { userData, company } = useAuth();
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

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

      toast.success(`Relance envoyée à ${contact?.name || 'Client'}`);
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la relance");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relances Clients</h1>
        <p className="text-muted-foreground">Gérez vos factures impayées et envoyez des relances.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-rose-500" size={20} />
            Factures en retard ({overdueInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueInvoices.map(inv => {
                const contact = contacts.find(c => c.id === inv.contactId);
                const daysLate = differenceInDays(new Date(), parseISO(inv.dueDate));
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell>{contact?.name || 'Inconnu'}</TableCell>
                    <TableCell>{format(parseISO(inv.dueDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="gap-1">
                        <Clock size={12} />
                        {daysLate} jours
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {inv.totalAmount.toLocaleString()} {company?.currency}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => handleSendReminder(inv)}>
                          <Send size={14} /> Relancer
                        </Button>
                        <Button variant="ghost" size="icon" title="Historique">
                          <History size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {overdueInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Aucune facture en retard. Félicitations !</p>
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
