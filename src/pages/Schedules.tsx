import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Schedules() {
  const { userData, company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    if (!userData?.companyId) return;
    
    const qInvoices = query(
      collection(db, `companies/${userData.companyId}/invoices`),
      orderBy('dueDate', 'asc')
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

    return () => {
      unsubscribeInvoices();
      unsubscribeContacts();
    };
  }, [userData]);

  const getStatus = (invoice: any) => {
    if (invoice.status === 'paid') return { label: 'Payé', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 };
    const today = new Date();
    const dueDate = parseISO(invoice.dueDate);
    if (isBefore(dueDate, today)) return { label: 'En retard', color: 'bg-rose-500/10 text-rose-500', icon: AlertCircle };
    if (isBefore(dueDate, addDays(today, 7))) return { label: 'Proche', color: 'bg-amber-500/10 text-amber-500', icon: Clock };
    return { label: 'À venir', color: 'bg-blue-500/10 text-blue-500', icon: CalendarIcon };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Échéanciers</h1>
        <p className="text-muted-foreground">Suivez vos encaissements et décaissements à venir.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total à encaisser (Clients)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter(i => i.type === 'sale' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total à payer (Fournisseurs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {invoices.filter(i => i.type === 'purchase' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde prévisionnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(invoices.filter(i => i.type === 'sale' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0) - 
                invoices.filter(i => i.type === 'purchase' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0)).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail des échéances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Échéance</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead>Tiers</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.filter(i => i.status !== 'paid').map(inv => {
                const contact = contacts.find(c => c.id === inv.contactId);
                const status = getStatus(inv);
                const StatusIcon = status.icon;
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(inv.dueDate), 'dd MMMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{inv.number}</TableCell>
                    <TableCell>{contact?.name || 'Inconnu'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {inv.type === 'sale' ? 'Client' : 'Fournisseur'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {inv.totalAmount.toLocaleString()} {company?.currency}
                    </TableCell>
                    <TableCell>
                      <div className={cn("flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium w-fit", status.color)}>
                        <StatusIcon size={14} />
                        {status.label}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {invoices.filter(i => i.status !== 'paid').length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Aucune échéance en attente.
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
