import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Download, FileText, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import { downloadCSV } from '../lib/download-utils';

export default function FEC() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const handleDownload = () => {
    const data = [
      { JournalCode: 'AC', JournalLib: 'Achats', EcritureNum: '1', EcritureDate: '20240101', CompteNum: '401000', CompteLib: 'Fournisseur', Debit: '0', Credit: '100' },
      { JournalCode: 'AC', JournalLib: 'Achats', EcritureNum: '1', EcritureDate: '20240101', CompteNum: '607000', CompteLib: 'Achats de marchandises', Debit: '100', Credit: '0' }
    ];
    downloadCSV(data, `FEC_2024`);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setIsDone(false);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setIsDone(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Génération FEC</h1>
          <p className="text-muted-foreground">Fichier des Écritures Comptables (obligatoire en cas de contrôle).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Générer le fichier FEC</CardTitle>
            <CardDescription>
              Le fichier sera généré au format .txt conforme aux normes de la DGFIP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Exercice 2024</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  className="gap-2 px-12" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  {isGenerating ? "Génération en cours..." : "Générer le FEC 2024"}
                </Button>
              </div>
            </div>

            {isDone && (
              <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-green-800">Fichier généré avec succès !</p>
                  <p className="text-xs text-green-700">FEC_834567890_20241231.txt (1.2 MB)</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                  <Download size={14} /> Télécharger
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Points de vigilance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-sm">
              <CheckCircle2 className="text-green-500 shrink-0" size={16} />
              <span>Séquence de numérotation continue</span>
            </div>
            <div className="flex gap-3 text-sm">
              <CheckCircle2 className="text-green-500 shrink-0" size={16} />
              <span>Dates de validation présentes</span>
            </div>
            <div className="flex gap-3 text-sm text-amber-600 font-medium">
              <AlertTriangle className="shrink-0" size={16} />
              <span>12 écritures non lettrées</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground italic">
                Note : Le FEC doit être généré après la clôture définitive de l'exercice.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
