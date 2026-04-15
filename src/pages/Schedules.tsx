import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, AlertCircle, CheckCircle2, Search, Filter, Download, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Schedules() {
  const { userData, company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
    if (invoice.status === 'paid') return { label: 'Payé', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 };
    const today = new Date();
    const dueDate = parseISO(invoice.dueDate);
    if (isBefore(dueDate, today)) {
      const days = differenceInDays(today, dueDate);
      return { label: `Retard (${days}j)`, color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: AlertCircle };
    }
    if (isBefore(dueDate, addDays(today, 7))) return { label: 'Échéance proche', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock };
    return { label: 'À venir', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: CalendarIcon };
  };

  const filteredInvoices = invoices.filter(i => {
    const contact = contacts.find(c => c.id === i.contactId);
    const matchesSearch = 
      i.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'sales' && i.type === 'sale') || 
      (activeTab === 'purchases' && i.type === 'purchase');

    return i.status !== 'paid' && matchesSearch && matchesTab;
  });

  const totalReceivable = invoices.filter(i => i.type === 'sale' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalPayable = invoices.filter(i => i.type === 'purchase' && i.status !== 'paid').reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Échéanciers</h1>
          <p className="text-muted-foreground">Suivez vos encaissements et décaissements à venir pour une meilleure gestion de trésorerie.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} /> Exporter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-emerald-600">Total à encaisser</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {totalReceivable.toLocaleString()} {company?.currency}
            </div>
            <p className="text-xs text-emerald-600/70 mt-1">Factures clients non payées</p>
          </CardContent>
        </Card>
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-rose-600">Total à payer</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-700">
              {totalPayable.toLocaleString()} {company?.currency}
            </div>
            <p className="text-xs text-rose-600/70 mt-1">Factures fournisseurs à régler</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Solde prévisionnel</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {(totalReceivable - totalPayable).toLocaleString()} {company?.currency}
            </div>
            <p className="text-xs text-primary/70 mt-1">Différence encaissements / décaissements</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">Toutes les échéances</TabsTrigger>
            <TabsTrigger value="sales">Encaissements (Clients)</TabsTrigger>
            <TabsTrigger value="purchases">Décaissements (Fournisseurs)</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une facture ou un tiers..." 
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="m-0">
          <Card className="border-primary/10 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[150px]">Date d'Échéance</TableHead>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Tiers / Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut & Délai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map(inv => {
                    const contact = contacts.find(c => c.id === inv.contactId);
                    const status = getStatus(inv);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={inv.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarIcon size={14} className="text-muted-foreground" />
                            {format(parseISO(inv.dueDate), 'dd MMM yyyy', { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{contact?.name || 'Inconnu'}</span>
                            <span className="text-[10px] text-muted-foreground">{contact?.email || 'Pas d\'email'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px] uppercase font-bold",
                            inv.type === 'sale' ? "border-emerald-500/20 text-emerald-600 bg-emerald-500/5" : "border-rose-500/20 text-rose-600 bg-rose-500/5"
                          )}>
                            {inv.type === 'sale' ? 'Client' : 'Fournisseur'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm">
                          {inv.totalAmount.toLocaleString()} {company?.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase", status.color)}>
                            <StatusIcon size={12} />
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <div className="p-4 bg-muted rounded-full">
                            <Clock size={32} />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-foreground">Aucune échéance trouvée</p>
                            <p className="text-sm">Toutes vos factures sont à jour ou ne correspondent pas à votre recherche.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
