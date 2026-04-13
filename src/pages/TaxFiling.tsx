import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { downloadPDF } from '../lib/download-utils';
import { useAuth } from '../context/AuthContext';

export default function TaxFiling() {
  const { company } = useAuth();

  const handleExportAll = () => {
    const headers = [['Formulaire', 'Statut', 'Détails']];
    const data = [
      ['2033-A', 'Prêt', 'Bilan simplifié'],
      ['2033-B', 'Prêt', 'Compte de résultat'],
      ['2033-C', 'À vérifier', 'Immobilisations'],
      ['2033-D', 'Prêt', 'Provisions']
    ];
    downloadPDF(`Liasse Fiscale Complète - ${company?.name}`, headers, data, `Liasse_Fiscale_${new Date().getFullYear()}`);
  };

  const handleExportPDF = (form: string) => {
    const headers = [['Libellé', 'Montant']];
    const data = [
      ['Immobilisations nettes', '45 000'],
      ['Stocks', '12 500'],
      ['Créances', '28 400'],
      ['Disponibilités', '15 600'],
      ['TOTAL ACTIF', '101 500'],
      ['Capital social', '10 000'],
      ['Réserves', '35 000'],
      ['Résultat de l\'exercice', '12 500'],
      ['Dettes', '44 000'],
      ['TOTAL PASSIF', '101 500']
    ];
    downloadPDF(`Formulaire ${form} - ${company?.name}`, headers, data, `Formulaire_${form}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Liasse Fiscale</h1>
          <p className="text-muted-foreground">Générez vos formulaires fiscaux annuels (2031, 2033, 2050).</p>
        </div>
        <Button className="gap-2" onClick={handleExportAll}><Download size={18} /> Exporter la liasse complète</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-green-600 uppercase">Bilan</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-bold">Prêt</span>
            <CheckCircle2 className="text-green-500" size={20} />
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-green-600 uppercase">Compte de Résultat</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-bold">Prêt</span>
            <CheckCircle2 className="text-green-500" size={20} />
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-amber-600 uppercase">Immobilisations</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-bold">À vérifier</span>
            <AlertCircle className="text-amber-500" size={20} />
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-primary uppercase">Télédéclaration</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-lg font-bold">EDI-TVA</span>
            <FileText className="text-primary" size={20} />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="2033-a" className="space-y-4">
        <TabsList>
          <TabsTrigger value="2033-a">2033-A (Bilan)</TabsTrigger>
          <TabsTrigger value="2033-b">2033-B (Résultat)</TabsTrigger>
          <TabsTrigger value="2033-c">2033-C (Immos)</TabsTrigger>
          <TabsTrigger value="2033-d">2033-D (Provisions)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="2033-a">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Formulaire 2033-A</CardTitle>
                <CardDescription>Bilan simplifié - Actif et Passif</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Printer size={14} className="mr-2" /> Imprimer</Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('2033-A')}><Download size={14} className="mr-2" /> PDF</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-8 max-w-3xl mx-auto border p-8 bg-white text-slate-900 shadow-sm">
                <div className="text-center border-b-2 border-slate-900 pb-4">
                  <h3 className="text-xl font-black uppercase">Bilan Simplifié</h3>
                  <p className="text-sm">Exercice clos le 31/12/2024</p>
                </div>
                
                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-slate-300 pb-1">ACTIF</h4>
                    <div className="flex justify-between text-sm">
                      <span>Immobilisations nettes</span>
                      <span className="font-mono">45 000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Stocks</span>
                      <span className="font-mono">12 500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Créances</span>
                      <span className="font-mono">28 400</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Disponibilités</span>
                      <span className="font-mono">15 600</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-900 pt-2">
                      <span>TOTAL ACTIF</span>
                      <span className="font-mono">101 500</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b border-slate-300 pb-1">PASSIF</h4>
                    <div className="flex justify-between text-sm">
                      <span>Capital social</span>
                      <span className="font-mono">10 000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Réserves</span>
                      <span className="font-mono">35 000</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Résultat de l'exercice</span>
                      <span className="font-mono">12 500</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Dettes</span>
                      <span className="font-mono">44 000</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-900 pt-2">
                      <span>TOTAL PASSIF</span>
                      <span className="font-mono">101 500</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
