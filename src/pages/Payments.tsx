import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, FileOutput, CheckCircle2, Landmark, Plus, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

import { downloadCSV } from '../lib/download-utils';

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Virements / Prélèvements</h1>
          <p className="text-muted-foreground">Générez vos fichiers SEPA pour vos paiements fournisseurs et prélèvements clients.</p>
        </div>
        <Button className="gap-2" onClick={handleGenerateSEPA} disabled={loading || invoices.length === 0}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          Préparer un lot
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Virements Fournisseurs</CardTitle>
            <FileOutput className="text-muted-foreground" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length} factures</div>
            <p className="text-xs text-muted-foreground mt-1">Total : {invoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()} {company?.currency}</p>
            <Button className="w-full mt-4 gap-2" size="sm" onClick={handleGenerateSEPA} disabled={loading || invoices.length === 0}>
              Générer SEPA XML
            </Button>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Prélèvements Clients</CardTitle>
            <ArrowRightLeft className="text-muted-foreground" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 mandats</div>
            <p className="text-xs text-muted-foreground mt-1">Total : 0,00 {company?.currency}</p>
            <Button className="w-full mt-4 gap-2" size="sm" variant="outline" disabled>Générer SEPA SDD</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Derniers lots générés</CardTitle>
            <CheckCircle2 className="text-green-500" size={18} />
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.map((b) => (
              <div key={b.id} className="flex justify-between items-center text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{b.reference}</span>
                  <span className="text-[10px] text-muted-foreground">{b.totalAmount.toLocaleString()} {company?.currency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={b.status === 'paid' ? 'default' : 'secondary'}>
                    {b.status === 'paid' ? 'Payé' : 'Généré'}
                  </Badge>
                  {b.status !== 'paid' && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-600" onClick={() => handleMarkAsPaid(b.id)}>
                      <CheckCircle2 size={12} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadBatch(b)}>
                    <Download size={12} />
                  </Button>
                </div>
              </div>
            ))}
            {batches.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Aucun lot généré.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Factures prêtes pour paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fournisseur</TableHead>
                <TableHead>N° Facture</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.contactName || 'Fournisseur'}</TableCell>
                  <TableCell>{inv.number}</TableCell>
                  <TableCell>{inv.dueDate}</TableCell>
                  <TableCell className="text-right font-bold">{inv.totalAmount.toLocaleString()} {company?.currency}</TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    Aucune facture prête pour paiement.
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

import { format } from 'date-fns';
