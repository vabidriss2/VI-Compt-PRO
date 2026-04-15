import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Download, Calculator, Loader2, Calendar, History, FileText, CheckCircle2, AlertCircle, ChevronRight, Info, ArrowRight, Printer, RefreshCw, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { downloadPDF } from '../lib/download-utils';

export default function VAT() {
  const { userData, company } = useAuth();
  const [period, setPeriod] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [vatData, setVatData] = useState({
    collected: 0,
    deductible: 0,
    baseCollected: 0,
    baseDeductible: 0,
    rates: {
      '20': { base: 0, tax: 0 },
      '10': { base: 0, tax: 0 },
      '5.5': { base: 0, tax: 0 },
      '2.1': { base: 0, tax: 0 },
    },
    details: [] as any[]
  });

  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return format(d, 'yyyy-MM');
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/vat_declarations`),
      orderBy('period', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeclarations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vat_declarations');
    });

    return () => unsubscribe();
  }, [userData]);

  const calculateVAT = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const start = `${period}-01`;
      const end = format(endOfMonth(new Date(period)), 'yyyy-MM-dd');

      // Fetch journal entries for VAT accounts (usually starting with 445)
      const entriesQuery = query(
        collection(db, `companies/${userData.companyId}/journal_entries`),
        where('date', '>=', start),
        where('date', '<=', end)
      );

      const snapshot = await getDocs(entriesQuery);
      const entries = snapshot.docs.map(doc => doc.data());

      // In a real system, we'd filter by account codes:
      // 44571: TVA Collectée
      // 44566: TVA Déductible sur ABS
      // 44562: TVA Déductible sur Immos
      
      // For this demo, we'll simulate the logic based on entry types if available, 
      // or fallback to invoice-like logic if entries are simple
      let collected = 0;
      let deductible = 0;
      let baseCollected = 0;
      let baseDeductible = 0;

      entries.forEach((e: any) => {
        // Simplified logic for demo: assume entries with credit on VAT accounts are collected
        // and debit are deductible. In reality, it depends on the account code.
        if (e.accountId?.includes('4457')) { // Collected
          collected += Number(e.credit || 0) - Number(e.debit || 0);
        } else if (e.accountId?.includes('4456')) { // Deductible
          deductible += Number(e.debit || 0) - Number(e.credit || 0);
        }
      });

      // If no entries found, try to estimate from invoices to provide some data
      if (collected === 0 && deductible === 0) {
        const invQuery = query(
          collection(db, `companies/${userData.companyId}/invoices`),
          where('date', '>=', start),
          where('date', '<=', end)
        );
        const invSnap = await getDocs(invQuery);
        const invs = invSnap.docs.map(doc => doc.data());
        
        collected = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + (i.taxAmount || 0), 0);
        baseCollected = invs.filter((i: any) => i.type === 'sale').reduce((sum, i: any) => sum + (i.subtotal || 0), 0);
        deductible = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + (i.taxAmount || 0), 0);
        baseDeductible = invs.filter((i: any) => i.type === 'purchase').reduce((sum, i: any) => sum + (i.subtotal || 0), 0);
      }
      
      const rates = {
        '20': { base: collected / 0.2, tax: collected },
        '10': { base: 0, tax: 0 },
        '5.5': { base: 0, tax: 0 },
        '2.1': { base: 0, tax: 0 },
      };

      setVatData({ 
        collected, 
        deductible, 
        baseCollected: collected / 0.2, 
        baseDeductible: deductible / 0.2,
        rates,
        details: [
          { label: 'Ventes de biens et services (20%)', base: collected / 0.2, rate: '20%', tax: collected, type: 'collected' },
          { label: 'Achats de biens et services (20%)', base: deductible / 0.2, rate: '20%', tax: deductible, type: 'deductible' }
        ]
      });
      
      toast.success(`Calcul terminé pour ${format(new Date(period), 'MMMM yyyy', { locale: fr })}`);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'vat_calculation');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!userData?.companyId) return;
    try {
      const declaration = {
        period,
        ...vatData,
        netToPay: vatData.collected - vatData.deductible,
        status: 'validated',
        createdAt: new Date().toISOString(),
        companyId: userData.companyId,
        validatedBy: userData.uid
      };

      await addDoc(collection(db, `companies/${userData.companyId}/vat_declarations`), declaration);
      await logAction(userData.companyId, userData.uid, 'CREATE', 'vat_declarations', null, declaration);
      
      toast.success("Déclaration de TVA validée et archivée !");
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'vat_declarations');
    }
  };

  const handleDownloadJustificatif = () => {
    const headers = [['Libellé', 'Base HT', 'Taux', 'Taxe']];
    const data = vatData.details.map(d => [
      d.label,
      d.base.toLocaleString(),
      d.rate,
      d.tax.toLocaleString()
    ]);
    
    data.push(['TOTAL COLLECTÉE', vatData.baseCollected.toLocaleString(), '-', vatData.collected.toLocaleString()]);
    data.push(['TOTAL DÉDUCTIBLE', vatData.baseDeductible.toLocaleString(), '-', vatData.deductible.toLocaleString()]);
    data.push(['NET À PAYER / CRÉDIT', '-', '-', (vatData.collected - vatData.deductible).toLocaleString()]);
    
    downloadPDF(`Justificatif TVA - ${period}`, headers, data, `TVA_${period}`);
  };

  const netToPay = vatData.collected - vatData.deductible;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Déclarations TVA</h1>
          <p className="text-muted-foreground">Gestion des déclarations périodiques (CA3/CA12) et contrôle de TVA.</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48 h-9 text-xs bg-white shadow-sm">
              <Calendar size={14} className="mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map(p => (
                <SelectItem key={p} value={p}>
                  {format(new Date(p), 'MMMM yyyy', { locale: fr })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="h-9 text-xs gap-2 shadow-sm" onClick={calculateVAT} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <Calculator size={14} />}
            Calculer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">TVA Collectée (CA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-600">{vatData.collected.toLocaleString()} {company?.currency}</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Base HT : {vatData.baseCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">TVA Déductible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">{vatData.deductible.toLocaleString()} {company?.currency}</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Base HT : {vatData.baseDeductible.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className={cn("border-slate-100 bg-slate-50/30", netToPay < 0 && "bg-amber-50/30")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">
              {netToPay >= 0 ? "TVA à décaisser" : "Crédit de TVA"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", netToPay >= 0 ? "text-primary" : "text-amber-600")}>
              {Math.abs(netToPay).toLocaleString()} {company?.currency}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Statut Période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-[10px] font-bold uppercase tracking-widest">En cours</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger><Info size={14} className="text-primary/60" /></TooltipTrigger>
                  <TooltipContent><p className="text-xs">Date limite de dépôt : 19/{format(new Date(period), 'MM/yyyy')}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Progress value={45} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ca3" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="ca3" className="gap-2"><FileText size={14} /> Formulaire CA3</TabsTrigger>
          <TabsTrigger value="details" className="gap-2"><Layers size={14} /> Détails par Taux</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History size={14} /> Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="ca3" className="m-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-3">
                <CardTitle className="text-xs font-black uppercase tracking-widest">Formulaire CA3 - Déclaration de TVA</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 space-y-8">
                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b pb-1">A. Opérations Imposables</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">01 - Ventes, prestations de services</span>
                        <span className="font-mono font-bold">{vatData.baseCollected.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">02 - Autres opérations imposables</span>
                        <span className="font-mono font-bold">0</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b pb-1">B. Décompte de la TVA à payer</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">08 - Taux normal 20%</span>
                        <div className="flex gap-8">
                          <span className="text-slate-400 italic">Base: {vatData.rates['20'].base.toLocaleString()}</span>
                          <span className="font-mono font-bold w-24 text-right">{vatData.rates['20'].tax.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">09 - Taux réduit 10%</span>
                        <div className="flex gap-8">
                          <span className="text-slate-400 italic">Base: 0</span>
                          <span className="font-mono font-bold w-24 text-right">0</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t pt-2">
                        <span className="font-bold">16 - Total TVA brute due</span>
                        <span className="font-mono font-black text-blue-600">{vatData.collected.toLocaleString()}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b pb-1">C. TVA Déductible</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">19 - Biens constituant des immobilisations</span>
                        <span className="font-mono font-bold">0</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">20 - Autres biens et services</span>
                        <span className="font-mono font-bold">{vatData.deductible.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-t pt-2">
                        <span className="font-bold">23 - Total TVA déductible</span>
                        <span className="font-mono font-black text-emerald-600">{vatData.deductible.toLocaleString()}</span>
                      </div>
                    </div>
                  </section>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Net à payer / Crédit</p>
                      <p className="text-2xl font-black text-primary">{netToPay.toLocaleString()} {company?.currency}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 text-[10px] gap-2" onClick={handleDownloadJustificatif}>
                        <Download size={14} /> Justificatif
                      </Button>
                      <Button size="sm" className="h-8 text-[10px] gap-2" onClick={handleValidate}>
                        <FileCheck size={14} /> Valider
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-wider">Checklist de Clôture</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="h-5 w-5 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-50">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">Lettrage des comptes tiers terminé</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="h-5 w-5 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-50">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600">Rapprochement bancaire à jour</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center" />
                    <span className="text-[11px] font-medium text-slate-600">Vérification des taux de TVA</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center" />
                    <span className="text-[11px] font-medium text-slate-600">Contrôle des factures non parvenues</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-slate-900 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400">Aide & Conformité</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[10px] leading-relaxed text-slate-300 italic">
                    "La déclaration CA3 doit être déposée mensuellement ou trimestriellement selon votre régime d'imposition. Assurez-vous que toutes les pièces justificatives sont archivées pendant 10 ans."
                  </p>
                  <Button variant="link" className="text-primary p-0 h-auto text-[10px] mt-4 hover:no-underline">
                    Consulter la documentation fiscale <ArrowRight size={10} className="ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-sm font-black uppercase tracking-wider">Détail des Opérations par Taux</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold pl-6">Libellé de l'opération</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Base HT</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Taux</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold pr-6">Montant TVA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatData.details.map((d, i) => (
                    <TableRow key={i} className="hover:bg-slate-50/50 border-slate-100">
                      <TableCell className="pl-6">
                        <p className="text-xs font-bold text-slate-900">{d.label}</p>
                        <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">{d.type}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.base.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{d.rate}</TableCell>
                      <TableCell className={cn(
                        "text-right font-mono text-xs font-black pr-6",
                        d.type === 'collected' ? "text-blue-600" : "text-emerald-600"
                      )}>
                        {d.tax.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-sm font-black uppercase tracking-wider">Historique des Déclarations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold pl-6">Période</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Statut</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Collectée</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Déductible</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold pr-6">Net à payer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.length > 0 ? (
                    declarations.map((d) => (
                      <TableRow key={d.id} className="hover:bg-slate-50/50 border-slate-100">
                        <TableCell className="pl-6 text-xs font-black uppercase">{format(new Date(d.period), 'MMMM yyyy', { locale: fr })}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest">
                            Validée
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{d.collected.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{d.deductible.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-black pr-6">{d.netToPay.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic text-xs">
                        Aucun historique disponible.
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
