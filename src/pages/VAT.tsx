import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Download, Calculator, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';

import { downloadPDF } from '../lib/download-utils';

export default function VAT() {
  const { userData, company } = useAuth();
  const [period, setPeriod] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(false);
  const [vatData, setVatData] = useState({
    collected: 0,
    deductible: 0,
    baseCollected: 0,
    baseDeductible: 0
  });

  const handleDownloadJustificatif = () => {
    const headers = [['Libellé', 'Base HT', 'Taux', 'Taxe']];
    const data = [
      ['Ventes de biens (Taux normal)', vatData.baseCollected.toLocaleString(), '20%', vatData.collected.toLocaleString()],
      ['Achats de biens (Taux normal)', vatData.baseDeductible.toLocaleString(), '20%', vatData.deductible.toLocaleString()],
      ['TOTAL COLLECTÉE', vatData.baseCollected.toLocaleString(), '-', vatData.collected.toLocaleString()],
      ['TOTAL DÉDUCTIBLE', vatData.baseDeductible.toLocaleString(), '-', vatData.deductible.toLocaleString()],
      ['NET À PAYER / CRÉDIT', '-', '-', (vatData.collected - vatData.deductible).toLocaleString()]
    ];
    downloadPDF(`Justificatif TVA - ${period}`, headers, data, `TVA_${period}`);
  };

  const calculateVAT = async () => {
    setLoading(true);
    try {
      // In a real app, we'd query journal_entries for the period and VAT accounts
      // For this demo, we'll fetch invoices for the period
      const q = query(
        collection(db, `companies/${userData!.companyId}/invoices`),
        where('date', '>=', `${period}-01`),
        where('date', '<=', `${period}-31`)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const invs = snapshot.docs.map(doc => doc.data());
        const collected = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + (i.taxAmount || 0), 0);
        const baseCollected = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + (i.subtotal || 0), 0);
        const deductible = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + (i.taxAmount || 0), 0);
        const baseDeductible = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + (i.subtotal || 0), 0);

        setVatData({ collected, deductible, baseCollected, baseDeductible });
        setLoading(false);
        toast.success("Calcul de TVA terminé pour la période " + period);
      });

      return () => unsubscribe();
    } catch (error) {
      toast.error("Erreur lors du calcul de la TVA");
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      const declaration = {
        period,
        ...vatData,
        netToPay: vatData.collected - vatData.deductible,
        status: 'validated',
        createdAt: serverTimestamp(),
        companyId: userData!.companyId
      };

      await addDoc(collection(db, `companies/${userData!.companyId}/vat_declarations`), declaration);
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'vat_declarations', null, declaration);
      
      toast.success("Déclaration de TVA validée !");
    } catch (error) {
      toast.error("Erreur lors de la validation");
    }
  };

  const netToPay = vatData.collected - vatData.deductible;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Déclarations TVA</h1>
          <p className="text-muted-foreground">Calculez et préparez vos déclarations de TVA (CA3).</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-03">Mars 2024</SelectItem>
              <SelectItem value="2024-04">Avril 2024</SelectItem>
              <SelectItem value="2024-05">Mai 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={calculateVAT} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Calculator size={18} />}
            Calculer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">TVA Collectée (Ventes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{vatData.collected.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-blue-600/70 mt-1">Base HT : {vatData.baseCollected.toLocaleString()} {company?.currency}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">TVA Déductible (Achats)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{vatData.deductible.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-green-600/70 mt-1">Base HT : {vatData.baseDeductible.toLocaleString()} {company?.currency}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Net à payer / Crédit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{netToPay.toLocaleString()} {company?.currency}</div>
            <p className="text-xs text-primary/70 mt-1">{netToPay >= 0 ? "TVA à décaisser" : "Crédit de TVA"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail par taux</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Base HT</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead className="text-right">Taxe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Ventes de biens (Taux normal)</TableCell>
                <TableCell className="text-right">{vatData.baseCollected.toLocaleString()}</TableCell>
                <TableCell className="text-right">20%</TableCell>
                <TableCell className="text-right font-bold">{vatData.collected.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL COLLECTÉE</TableCell>
                <TableCell className="text-right">{vatData.baseCollected.toLocaleString()}</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{vatData.collected.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" className="gap-2" onClick={handleDownloadJustificatif}><Download size={18} /> Télécharger le justificatif</Button>
        <Button className="gap-2" onClick={handleValidate} disabled={vatData.baseCollected === 0 && vatData.baseDeductible === 0}>
          <FileCheck size={18} /> Valider la déclaration
        </Button>
      </div>
    </div>
  );
}
