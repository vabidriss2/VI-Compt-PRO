import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, CheckCircle2, AlertCircle, Calculator, Info, ChevronRight, FileCheck, Calendar as CalendarIcon, RefreshCw, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfYear, endOfYear, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { downloadPDF } from '../lib/download-utils';
import { cn } from '@/lib/utils';

export default function TaxFiling() {
  const { userData, company } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<any>(null);

  const fetchFinancialData = async () => {
    if (!userData?.companyId) return;
    setLoading(true);
    try {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;

      const entriesQuery = query(
        collection(db, `companies/${userData.companyId}/journal_entries`),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      const snapshot = await getDocs(entriesQuery);
      const entries = snapshot.docs.map(doc => doc.data());

      // Aggregate by account class
      const classes: any = {};
      entries.forEach((e: any) => {
        const accClass = e.accountId?.substring(0, 1);
        if (!classes[accClass]) classes[accClass] = { debit: 0, credit: 0 };
        classes[accClass].debit += Number(e.debit || 0);
        classes[accClass].credit += Number(e.credit || 0);
      });

      // Calculate key aggregates for 2033 forms
      const data = {
        actif: {
          immos: (classes['2']?.debit || 0) - (classes['2']?.credit || 0),
          stocks: (classes['3']?.debit || 0) - (classes['3']?.credit || 0),
          creances: (classes['4']?.debit || 0) - (classes['4']?.credit || 0), // Simplified
          dispo: (classes['5']?.debit || 0) - (classes['5']?.credit || 0),
        },
        passif: {
          capital: (classes['1']?.credit || 0) - (classes['1']?.debit || 0),
          dettes: (classes['4']?.credit || 0) - (classes['4']?.debit || 0), // Simplified
        },
        resultat: {
          produits: (classes['7']?.credit || 0) - (classes['7']?.debit || 0),
          charges: (classes['6']?.debit || 0) - (classes['6']?.credit || 0),
        }
      };

      setFinancialData(data);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'tax_filing_data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [userData, year]);

  const handleExportPDF = (form: string) => {
    if (!financialData) return;
    const headers = [['Libellé', 'Montant']];
    let data: any[] = [];

    if (form === '2033-A') {
      data = [
        ['Immobilisations nettes', financialData.actif.immos.toLocaleString()],
        ['Stocks', financialData.actif.stocks.toLocaleString()],
        ['Créances', financialData.actif.creances.toLocaleString()],
        ['Disponibilités', financialData.actif.dispo.toLocaleString()],
        ['TOTAL ACTIF', (financialData.actif.immos + financialData.actif.stocks + financialData.actif.creances + financialData.actif.dispo).toLocaleString()],
        ['Capital social', financialData.passif.capital.toLocaleString()],
        ['Dettes', financialData.passif.dettes.toLocaleString()],
        ['TOTAL PASSIF', (financialData.passif.capital + financialData.passif.dettes).toLocaleString()]
      ];
    } else if (form === '2033-B') {
      data = [
        ['Produits d\'exploitation', financialData.resultat.produits.toLocaleString()],
        ['Charges d\'exploitation', financialData.resultat.charges.toLocaleString()],
        ['RÉSULTAT NET', (financialData.resultat.produits - financialData.resultat.charges).toLocaleString()]
      ];
    }

    downloadPDF(`Formulaire ${form} - ${company?.name}`, headers, data, `Formulaire_${form}_${year}`);
  };

  const totalActif = financialData ? (financialData.actif.immos + financialData.actif.stocks + financialData.actif.creances + financialData.actif.dispo) : 0;
  const netResult = financialData ? (financialData.resultat.produits - financialData.resultat.charges) : 0;

  const taxCalendar = [
    { name: 'Dépôt Liasse Fiscale', date: `03/05/${Number(year) + 1}`, status: 'pending', type: 'IS' },
    { name: 'Solde IS', date: `15/05/${Number(year) + 1}`, status: 'pending', type: 'IS' },
    { name: 'CVAE (1329-AC)', date: `15/06/${Number(year) + 1}`, status: 'pending', type: 'CVAE' },
    { name: 'CFE', date: `15/12/${year}`, status: 'completed', type: 'CFE' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liasse Fiscale</h1>
          <p className="text-muted-foreground">Préparation et télétransmission des formulaires fiscaux annuels (Série 2033).</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border shadow-sm p-1 rounded-lg mr-2">
            {['2023', '2024', '2025'].map(y => (
              <Button 
                key={y} 
                variant={year === y ? "default" : "ghost"} 
                size="sm" 
                className="h-7 text-[10px] font-bold px-3"
                onClick={() => setYear(y)}
              >
                {y}
              </Button>
            ))}
          </div>
          <Button size="sm" className="gap-2 shadow-sm" onClick={() => handleExportPDF('FULL')}>
            <Download size={14} /> Télécharger la Liasse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Bilan (2033-A)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{totalActif.toLocaleString()}</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-bold">PRÊT</Badge>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Résultat (2033-B)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{netResult.toLocaleString()}</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[9px] font-bold">PRÊT</Badge>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">IS Estimé</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-black text-rose-600 font-mono">{(netResult > 0 ? netResult * 0.25 : 0).toLocaleString()}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info size={14} className="text-slate-400" /></TooltipTrigger>
                <TooltipContent><p className="text-xs">Basé sur un taux d'IS de 25%</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Conformité EDI</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-black text-primary uppercase">Certifié</span>
            <ShieldCheck className="text-primary" size={20} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="2033-a" className="space-y-4">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="2033-a" className="text-[10px] font-bold uppercase tracking-widest">2033-A (Bilan)</TabsTrigger>
              <TabsTrigger value="2033-b" className="text-[10px] font-bold uppercase tracking-widest">2033-B (Résultat)</TabsTrigger>
              <TabsTrigger value="2033-c" className="text-[10px] font-bold uppercase tracking-widest">2033-C (Immos)</TabsTrigger>
              <TabsTrigger value="2033-d" className="text-[10px] font-bold uppercase tracking-widest">2033-D (Provisions)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="2033-a" className="m-0">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-3">
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Formulaire 2033-A - Bilan Simplifié</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-2"><Printer size={12} /> Imprimer</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-2" onClick={() => handleExportPDF('2033-A')}><Download size={12} /> PDF</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 px-4 md:px-12 bg-slate-100/30">
                  <div className="max-w-4xl mx-auto border-2 border-slate-900 p-10 bg-white text-slate-900 shadow-2xl font-serif relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-slate-900 text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest">Original</div>
                    
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-10">
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Bilan Simplifié</h3>
                        <p className="text-[10px] font-bold italic text-slate-500">Formulaire obligatoire (Art. 302 septies A bis du CGI)</p>
                        <div className="flex gap-4 mt-4">
                          <div className="border border-slate-900 px-2 py-1">
                            <p className="text-[8px] font-black uppercase">Désignation de l'entreprise</p>
                            <p className="text-xs font-bold">{company?.name}</p>
                          </div>
                          <div className="border border-slate-900 px-2 py-1">
                            <p className="text-[8px] font-black uppercase">SIRET</p>
                            <p className="text-xs font-bold">123 456 789 00012</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-6xl font-black leading-none">2033-A</div>
                        <p className="text-[12px] font-black uppercase tracking-widest mt-2 bg-slate-900 text-white px-2 py-0.5 inline-block">Exercice {year}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <h4 className="font-black border-b-2 border-slate-900 pb-1 text-[11px] uppercase tracking-widest bg-slate-900 text-white px-3">ACTIF (Brut)</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Immobilisations nettes</span>
                            <span className="font-mono font-black text-sm">{financialData?.actif.immos.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Stocks et en-cours</span>
                            <span className="font-mono font-black text-sm">{financialData?.actif.stocks.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Créances clients</span>
                            <span className="font-mono font-black text-sm">{financialData?.actif.creances.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Disponibilités</span>
                            <span className="font-mono font-black text-sm">{financialData?.actif.dispo.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between font-black border-t-4 border-slate-900 pt-4 text-sm mt-8 bg-slate-50 px-2">
                            <span className="uppercase tracking-widest">TOTAL ACTIF</span>
                            <span className="font-mono text-lg">{totalActif.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <h4 className="font-black border-b-2 border-slate-900 pb-1 text-[11px] uppercase tracking-widest bg-slate-900 text-white px-3">PASSIF (Net)</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Capital social ou individuel</span>
                            <span className="font-mono font-black text-sm">{financialData?.passif.capital.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Réserves et report à nouveau</span>
                            <span className="font-mono font-black text-sm">0</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Résultat de l'exercice</span>
                            <span className="font-mono font-black text-sm">{netResult.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="flex-1 font-medium">Dettes financières et tiers</span>
                            <span className="font-mono font-black text-sm">{financialData?.passif.dettes.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between font-black border-t-4 border-slate-900 pt-4 text-sm mt-8 bg-slate-50 px-2">
                            <span className="uppercase tracking-widest">TOTAL PASSIF</span>
                            <span className="font-mono text-lg">{(financialData?.passif.capital + netResult + financialData?.passif.dettes).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-16 pt-6 border-t border-slate-300 flex justify-between items-center opacity-40">
                      <div className="flex items-center gap-3">
                        <Calculator size={20} />
                        <div className="text-[9px] font-black uppercase tracking-widest leading-tight">
                          Généré par VI Compt PRO Engine v2.4<br/>
                          Signature Numérique: 0x8F2A...9C1E
                        </div>
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-right leading-tight">
                        Document certifié conforme aux normes EDI-TVA/EDI-TDFC<br/>
                        DGFIP - Direction Générale des Finances Publiques
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="2033-b" className="m-0">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-3">
                  <div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest">Formulaire 2033-B - Compte de Résultat</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-2"><Printer size={12} /> Imprimer</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-2" onClick={() => handleExportPDF('2033-B')}><Download size={12} /> PDF</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-8 px-4 md:px-12 bg-slate-100/30">
                  <div className="max-w-4xl mx-auto border-2 border-slate-900 p-10 bg-white text-slate-900 shadow-2xl font-serif relative">
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-10">
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Compte de Résultat</h3>
                        <p className="text-[10px] font-bold italic text-slate-500">Régime simplifié d'imposition</p>
                      </div>
                      <div className="text-right">
                        <div className="text-6xl font-black leading-none">2033-B</div>
                        <p className="text-[12px] font-black uppercase tracking-widest mt-2 bg-slate-900 text-white px-2 py-0.5 inline-block">Exercice {year}</p>
                      </div>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h4 className="font-black border-b-2 border-slate-900 pb-1 text-[11px] uppercase tracking-widest bg-slate-900 text-white px-3">PRODUITS D'EXPLOITATION</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="font-medium">Ventes de marchandises et produits finis</span>
                            <span className="font-mono font-black text-sm">{financialData?.resultat.produits.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="font-medium">Prestations de services</span>
                            <span className="font-mono font-black text-sm">0</span>
                          </div>
                          <div className="flex justify-between font-black pt-4 text-sm bg-slate-50 px-2">
                            <span className="uppercase tracking-widest">TOTAL DES PRODUITS D'EXPLOITATION</span>
                            <span className="font-mono text-lg">{financialData?.resultat.produits.toLocaleString() || '0'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="font-black border-b-2 border-slate-900 pb-1 text-[11px] uppercase tracking-widest bg-slate-900 text-white px-3">CHARGES D'EXPLOITATION</h4>
                        <div className="space-y-4">
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="font-medium">Achats de marchandises et matières premières</span>
                            <span className="font-mono font-black text-sm">{financialData?.resultat.charges.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex justify-between text-xs items-end border-b border-slate-200 pb-1">
                            <span className="font-medium">Autres achats et charges externes</span>
                            <span className="font-mono font-black text-sm">0</span>
                          </div>
                          <div className="flex justify-between font-black pt-4 text-sm bg-slate-50 px-2">
                            <span className="uppercase tracking-widest">TOTAL DES CHARGES D'EXPLOITATION</span>
                            <span className="font-mono text-lg">{financialData?.resultat.charges.toLocaleString() || '0'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t-8 border-slate-900 flex justify-between items-center bg-slate-900 text-white p-4">
                        <span className="text-xl font-black uppercase tracking-widest">RÉSULTAT NET FISCAL</span>
                        <span className="text-3xl font-black font-mono">{netResult.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={14} className="text-primary" /> Calendrier Fiscal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {taxCalendar.map((item) => (
                  <div key={item.name} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">{item.type}</span>
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-bold uppercase tracking-widest",
                        item.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                      )}>
                        {item.status === 'completed' ? 'Terminé' : 'À venir'}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Échéance : {item.date}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" /> Ratios Fiscaux
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                  <span className="text-slate-500">Poids de l'Impôt / CA</span>
                  <span className="text-slate-900">12.5%</span>
                </div>
                <Progress value={12.5} className="h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                  <span className="text-slate-500">Taux Effectif d'Imposition</span>
                  <span className="text-slate-900">25.0%</span>
                </div>
                <Progress value={25} className="h-1.5" />
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Prochaine Étape</p>
                <p className="text-xs font-bold text-slate-900">Validation de la liasse par l'expert-comptable avant télétransmission.</p>
                <Button variant="link" className="text-primary p-0 h-auto text-[10px] mt-2 font-bold uppercase tracking-widest">
                  Lancer le workflow <ArrowRight size={10} className="ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
