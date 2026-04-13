import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportOCR() {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(2);
      toast.success("Fichier téléchargé avec succès");
    }, 1500);
  };

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
      toast.success("Analyse terminée par l'IA");
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importation (OCR)</h1>
        <p className="text-muted-foreground">Utilisez l'intelligence artificielle pour extraire les données de vos documents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={cn(step === 1 ? "border-primary ring-1 ring-primary" : "opacity-50")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
              Téléchargement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <Upload className="mx-auto text-muted-foreground" size={32} />
              <div className="space-y-1">
                <p className="text-sm font-medium">Glissez-déposez vos factures</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG (max 10MB)</p>
              </div>
              <Input type="file" className="hidden" id="file-upload" onChange={handleUpload} />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                Parcourir
              </Button>
            </div>
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="animate-spin" size={16} />
                Téléchargement en cours...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(step === 2 ? "border-primary ring-1 ring-primary" : "opacity-50")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">2</span>
              Analyse IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4 h-[180px]">
              <Sparkles className="text-primary" size={32} />
              <p className="text-sm">Extraction automatique des dates, montants et fournisseurs.</p>
              <Button disabled={step !== 2 || isProcessing} onClick={handleProcess}>
                {isProcessing ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Sparkles className="mr-2" size={16} />}
                Lancer l'analyse
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(step === 3 ? "border-primary ring-1 ring-primary" : "opacity-50")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">3</span>
              Validation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-4 h-[180px]">
              <CheckCircle2 className="text-green-500" size={32} />
              <p className="text-sm">Vérifiez les données extraites avant l'intégration en comptabilité.</p>
              <Button variant="outline" disabled={step !== 3}>
                <FileText className="mr-2" size={16} />
                Vérifier les données
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
