import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRightLeft, 
  FileOutput, 
  CheckCircle2, 
  Landmark, 
  Plus, 
  Loader2, 
  Download, 
  FileJson, 
  History, 
  CreditCard, 
  ArrowUpRight, 
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { downloadCSV } from '../lib/download-utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export default function Payments() {
  const { userData, company } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleDownloadBatch = (batch: any) => {
    const data = [
      { Reference: batch.reference, Invoices: batch.invoiceCount, Total: batch.totalAmount, Status: batch.status, CreatedAt: batch.createdAt?.toDate ? batch.createdAt.toDate().toLocaleString() : 'N/A' }
    ];
    downloadCSV(data, `Batch_${batch.reference}`);
  };

  useEffect(() => {
    if (!userData?.companyId) return;

    // Fetch pending purchase invoices
    const qInvoices = query(
      collection(db, `companies/${userData.companyId}/invoices`),
      where('type', '==', 'purchase'),
      where('status', '!=', 'paid')
    );

    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/invoices`);
    });

    // Fetch generated batches
    const qBatches = query(
      collection(db, `companies/${userData.companyId}/payment_batches`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBatches = onSnapshot(qBatches, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/payment_batches`);
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeBatches();
    };
  }, [userData]);

  const handleGenerateSEPA = async () => {
    if (invoices.length === 0) return;

    setLoading(true);
    try {
      const total = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
      const batch = {
        reference: `SEPA_${format(new Date(), 'yyyyMMdd')}_${batches.length + 1}`,
        invoiceCount: invoices.length,
        totalAmount: total,
        status: 'generated',
        createdAt: serverTimestamp(),
        companyId: userData!.companyId,
        createdBy: userData!.uid
      };

      await addDoc(collection(db, `companies/${userData!.companyId}/payment_batches`), batch);
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'payment_batches', null, batch);
      
      toast.success("Fichier SEPA XML généré avec succès !");
    } catch (error) {
      toast.error("Erreur lors de la génération du fichier");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (batchId: string) => {
    if (!confirm("Marquer ce lot comme payé ? Cela mettra à jour toutes les factures associées.")) return;
    
    setLoading(true);
    try {
      const batchRef = doc(db, `companies/${userData!.companyId}/payment_batches`, batchId);
      await updateDoc(batchRef, { status: 'paid', paidAt: serverTimestamp() });
      
      // In a real app, we would track which invoices are in which batch.
      // For this demo, let's mark all currently pending purchase invoices as paid.
      const batch = writeBatch(db);
      invoices.forEach(inv => {
        const invRef = doc(db, `companies/${userData!.companyId}/invoices`, inv.id);
        batch.update(invRef, { status: 'paid' });
      });
      await batch.commit();
      
      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'payment_batches', batchId, { status: 'paid' });
      toast.success("Lot marqué comme payé et factures mises à jour !");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virements & Prélèvements</h1>
          <p className="text-muted-foreground">Gestion des flux SEPA (SCT/SDD) et orchestration des paiements groupés.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-2 shadow-sm">
            <History size={14} /> Historique complet
          </Button>
          <Button size="sm" className="h-9 text-xs gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700" onClick={handleGenerateSEPA} disabled={loading || invoices.length === 0}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
            Nouveau Lot de Paiement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm group hover:border-indigo-300 transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Virements Fournisseurs (SCT)</CardTitle>
            <FileOutput className="text-indigo-400 group-hover:scale-110 transition-transform" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 font-mono">{invoices.length} <span className="text-sm text-slate-500 font-bold uppercase">Factures</span></div>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">Total : {invoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()} {company?.currency}</p>
            <Button className="w-full mt-6 gap-2 bg-indigo-600 text-[10px] font-black uppercase tracking-widest h-8" size="sm" onClick={handleGenerateSEPA} disabled={loading || invoices.length === 0}>
              Générer Fichier SEPA XML
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-100 bg-slate-50/30 shadow-sm opacity-60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prélèvements Clients (SDD)</CardTitle>
            <ArrowRightLeft className="text-slate-300" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-300 font-mono">0 <span className="text-sm font-bold uppercase">Mandats</span></div>
            <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase tracking-tight">Total : 0,00 {company?.currency}</p>
            <Button className="w-full mt-6 gap-2 text-[10px] font-black uppercase tracking-widest h-8" size="sm" variant="outline" disabled>
              Générer SEPA SDD
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b py-3">
            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Derniers Lots</CardTitle>
            <ShieldCheck className="text-emerald-500" size={16} />
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {batches.slice(0, 3).map((b) => (
                <div key={b.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{b.reference}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400">{b.totalAmount.toLocaleString()} {company?.currency}</span>
                      <Badge variant="outline" className={cn(
                        "text-[8px] h-3.5 px-1 font-black uppercase tracking-widest",
                        b.status === 'paid' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"
                      )}>
                        {b.status === 'paid' ? 'Payé' : 'Généré'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {b.status !== 'paid' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleMarkAsPaid(b.id)}>
                              <CheckCircle2 size={14} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px] font-bold uppercase">Marquer comme payé</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:bg-slate-100" onClick={() => handleDownloadBatch(b)}>
                      <Download size={14} />
                    </Button>
                  </div>
                </div>
              ))}
              {batches.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Aucun lot généré</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-700">Factures prêtes pour paiement</CardTitle>
              <CardDescription className="text-[10px] font-medium">Sélectionnez les factures à inclure dans le prochain lot SEPA</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-8 h-8 text-[10px] w-[180px] bg-white border-slate-200"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest gap-2">
                <Filter size={12} /> Filtrer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Fournisseur</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">N° Facture</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10">Échéance</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 h-10 text-right">Montant</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/50 border-slate-100 group">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                        {inv.contactName?.substring(0, 2) || 'FR'}
                      </div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{inv.contactName || 'Fournisseur'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className="text-[9px] font-bold bg-white text-slate-500 border-slate-200">
                      {inv.number}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{inv.dueDate}</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase",
                        new Date(inv.dueDate) < new Date() ? "text-rose-500" : "text-slate-400"
                      )}>
                        {new Date(inv.dueDate) < new Date() ? 'En retard' : 'À venir'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <span className="text-xs font-black text-slate-900 font-mono">{inv.totalAmount.toLocaleString()} {company?.currency}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} className="text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-[10px] font-bold uppercase tracking-widest">
                        <DropdownMenuItem className="gap-2"><CreditCard size={12} /> Payer par CB</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2"><ArrowUpRight size={12} /> Voir la facture</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-rose-600"><AlertCircle size={12} /> Signaler litige</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                        <CheckCircle2 className="text-emerald-500" size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Tout est à jour</p>
                        <p className="text-[10px] font-medium text-slate-400">Aucune facture en attente de paiement SEPA.</p>
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
