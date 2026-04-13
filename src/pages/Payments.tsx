import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, FileOutput, CheckCircle2, Landmark, Plus, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';

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
    });

    // Fetch generated batches
    const qBatches = query(
      collection(db, `companies/${userData.companyId}/payment_batches`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeBatches = onSnapshot(qBatches, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
                <span className="font-medium">{b.reference}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Généré</Badge>
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
