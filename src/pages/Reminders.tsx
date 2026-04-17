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
import { Send, History, AlertTriangle, MessageSquare, Clock, Search, Filter, CheckCircle2, Mail, Bell, ShieldAlert, Settings as SettingsIcon, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { sendEmailSimulation } from '../services/emailService';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function Reminders() {
  const { userData, company } = useAuth();
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAutoEnabled, setIsAutoEnabled] = useState(company?.reminderSettings?.enabled || false);
  const [rules, setRules] = useState<any[]>(company?.reminderSettings?.rules || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (company?.reminderSettings) {
      setIsAutoEnabled(company.reminderSettings.enabled || false);
      setRules(company.reminderSettings.rules || []);
    }
  }, [company]);

  const handleSaveSettings = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const companyRef = doc(db, 'companies', userData.companyId);
      await updateDoc(companyRef, {
        reminderSettings: {
          enabled: isAutoEnabled,
          rules: rules
        }
      });
      toast.success("Paramètres d'automatisme mis à jour !");
      setIsSettingsOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde des paramètres.");
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setRules([...rules, { days: 7, type: 'after', message: "Bonjour [nom_client], la facture [num_facture] est en retard de [jours] jours. Merci de régulariser." }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: string, value: any) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

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

  const handleSendReminder = async (invoice: any, customMessage?: string) => {
    try {
      const contact = contacts.find(c => c.id === invoice.contactId);
      const daysLate = differenceInDays(new Date(), parseISO(invoice.dueDate));
      
      const title = `Relance : Facture ${invoice.number} en retard`;
      let message = customMessage || `Bonjour ${contact?.name || 'Client'},\n\nSauf erreur de notre part, la facture ${invoice.number} d'un montant de ${invoice.totalAmount.toLocaleString()} ${company?.currency} est en retard de ${daysLate} jours.\n\nMerci de procéder au règlement dans les plus brefs délais.`;

      // Replace variables if customMessage
      if (customMessage) {
        message = message
          .replace('[nom_client]', contact?.name || 'Client')
          .replace('[num_facture]', invoice.number)
          .replace('[montant]', invoice.totalAmount.toLocaleString() + ' ' + (company?.currency || ''))
          .replace('[jours]', daysLate.toString());
      }

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

      if (!customMessage) toast.success(`Relance envoyée à ${contact?.name || 'Client'}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData!.companyId}/notifications`);
      if (!customMessage) toast.error("Erreur lors de l'envoi de la relance");
    }
  };

  const runAutomationSimulation = async () => {
    if (!isAutoEnabled || rules.length === 0) {
      toast.info("L'automatisation est désactivée ou aucune règle n'est définie.");
      return;
    }
    setLoading(true);
    try {
      let sentCount = 0;
      for (const inv of overdueInvoices) {
        const daysLate = differenceInDays(new Date(), parseISO(inv.dueDate));
        // Find if any rule matches the current delay
        const matchingRule = rules.find(r => r.type === 'after' && r.days === daysLate);
        
        if (matchingRule) {
          await handleSendReminder(inv, matchingRule.message);
          sentCount++;
        }
      }
      toast.success(`${sentCount} rappels automatiques envoyés selon vos règles.`);
    } catch (e) {
      toast.error("Erreur lors du traitement automatique");
    } finally {
      setLoading(false);
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
            variant="outline" 
            className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            disabled={!isAutoEnabled || loading}
            onClick={runAutomationSimulation}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Exécuter l'Automatisme
          </Button>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger variant="outline" className="gap-2 border-slate-200">
              <SettingsIcon size={16} />
              Configurer l'Automatisme
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="text-primary" size={20} />
                  Configuration des Rappels Automatiques
                </DialogTitle>
                <DialogDescription>
                  Définissez les règles pour l'envoi automatique des relances clients.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <Label className="text-base">Activer l'automatisation</Label>
                    <p className="text-xs text-muted-foreground">Les relances seront envoyées selon les règles ci-dessous.</p>
                  </div>
                  <Switch checked={isAutoEnabled} onCheckedChange={setIsAutoEnabled} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Règles de relance</h3>
                    <Button variant="ghost" size="sm" onClick={addRule} className="text-primary hover:text-primary/80 h-8 gap-1">
                      <Plus size={14} /> Ajouter une règle
                    </Button>
                  </div>

                  {rules.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-sm text-slate-400">Aucune règle définie.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <Card key={index} className="border-slate-200 shadow-none overflow-hidden hover:border-primary/30 transition-colors">
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-white bg-slate-400 w-6 h-6 rounded-full flex items-center justify-center">{index + 1}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <Input 
                                type="number" 
                                className="w-16 h-8 text-center" 
                                value={rule.days} 
                                onChange={(e) => updateRule(index, 'days', Number(e.target.value))} 
                              />
                              <Select value={rule.type} onValueChange={(v) => updateRule(index, 'type', v)}>
                                <SelectTrigger className="h-8 w-44">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="after">jours après l'échéance</SelectItem>
                                  <SelectItem value="before">jours avant l'échéance</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeRule(index)}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Message personnalisé</Label>
                            <Textarea 
                              className="text-xs min-h-[80px] bg-slate-50/50" 
                              value={rule.message} 
                              onChange={(e) => updateRule(index, 'message', e.target.value)}
                              placeholder="Message de la relance..."
                            />
                            <p className="text-[9px] text-slate-400">Variables : [nom_client], [num_facture], [montant], [jours]</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Annuler</Button>
                <Button onClick={handleSaveSettings} disabled={loading} className="gap-2">
                  {loading && <RefreshCw size={14} className="animate-spin" />}
                  Sauvegarder les règles
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
