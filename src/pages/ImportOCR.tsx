import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Sparkles, CheckCircle2, Loader2, X, Eye, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from "@google/genai";
import { cn } from '@/lib/utils';
import { useAuth } from '../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { logAction } from '../lib/audit';

export default function ImportOCR() {
  const { userData, company } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [extractedData, setExtractedData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Le fichier est trop volumineux (max 10MB)");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setStep(2);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const base64Data = await fileToBase64(file);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            },
            {
              text: "Analyse cette facture et extrais les informations suivantes au format JSON : date (YYYY-MM-DD), numéro de facture, nom du fournisseur, montant HT, montant TVA, montant TTC, devise. Si une information est manquante, mets null.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              number: { type: Type.STRING },
              vendor: { type: Type.STRING },
              amountHT: { type: Type.NUMBER },
              amountVAT: { type: Type.NUMBER },
              amountTTC: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
            required: ["date", "vendor", "amountTTC"],
          },
        },
      });

      const data = JSON.parse(response.text);
      setExtractedData(data);
      setStep(3);
      toast.success("Analyse terminée avec succès !");
    } catch (error: any) {
      console.error("OCR Error:", error);
      toast.error("Erreur lors de l'analyse : " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData || !userData?.companyId) return;
    
    try {
      const path = `companies/${userData.companyId}/invoices`;
      const docRef = await addDoc(collection(db, path), {
        ...extractedData,
        type: 'purchase', // Assuming OCR is mostly for purchase invoices
        status: 'pending',
        companyId: userData.companyId,
        createdAt: serverTimestamp(),
        ocrImported: true
      });

      await logAction(userData.companyId, userData.uid, 'CREATE', 'invoices', docRef.id, { ...extractedData, ocrImported: true });
      
      toast.success("Facture enregistrée en comptabilité !");
      setFile(null);
      setPreview(null);
      setExtractedData(null);
      setStep(1);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData.companyId}/invoices`);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importation (OCR)</h1>
          <p className="text-muted-foreground">L'intelligence artificielle au service de votre saisie comptable.</p>
        </div>
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={() => { setStep(1); setFile(null); setPreview(null); setExtractedData(null); }}>
            <X size={16} className="mr-2" /> Réinitialiser
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Upload */}
        <Card className={cn(
          "transition-all duration-300",
          step === 1 ? "border-primary shadow-md ring-1 ring-primary/20" : "opacity-60 grayscale-[0.5]"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>1</div>
              Téléchargement
            </CardTitle>
            <CardDescription>Importez votre document (PDF ou Image)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center space-y-4 transition-colors cursor-pointer hover:bg-muted/50",
                step === 1 ? "border-primary/30 bg-primary/5" : "border-muted"
              )}
              onClick={() => step === 1 && fileInputRef.current?.click()}
            >
              <div className="p-3 bg-white rounded-full w-fit mx-auto shadow-sm">
                <Upload className="text-primary" size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Glissez-déposez vos factures</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">PDF, JPG, PNG • Max 10MB</p>
              </div>
              <Input 
                type="file" 
                className="hidden" 
                ref={fileInputRef}
                accept="image/*,application/pdf"
                onChange={handleFileChange} 
              />
              <Button variant="outline" size="sm" className="w-full">
                Parcourir les fichiers
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: AI Analysis */}
        <Card className={cn(
          "transition-all duration-300",
          step === 2 ? "border-primary shadow-md ring-1 ring-primary/20" : "opacity-60 grayscale-[0.5]"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>2</div>
              Analyse IA
            </CardTitle>
            <CardDescription>Extraction intelligente des données</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
              {preview ? (
                <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border bg-white group">
                  <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="text-white" size={24} />
                  </div>
                </div>
              ) : (
                <Sparkles className="text-primary/40" size={48} />
              )}
              
              <div className="space-y-1">
                <p className="text-sm font-medium">Prêt pour l'analyse</p>
                <p className="text-xs text-muted-foreground">Gemini va extraire les montants et dates.</p>
              </div>

              <Button 
                className="w-full gap-2" 
                disabled={step !== 2 || isProcessing} 
                onClick={handleProcess}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Lancer l'analyse
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Validation */}
        <Card className={cn(
          "transition-all duration-300",
          step === 3 ? "border-primary shadow-md ring-1 ring-primary/20" : "opacity-60 grayscale-[0.5]"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>3</div>
              Validation
            </CardTitle>
            <CardDescription>Vérifiez et enregistrez</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedData ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Données extraites</span>
                    <CheckCircle2 className="text-emerald-500" size={14} />
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-muted-foreground">Fournisseur:</span>
                    <span className="font-bold text-right">{extractedData.vendor}</span>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-bold text-right">{extractedData.date}</span>
                    <span className="text-muted-foreground">N° Facture:</span>
                    <span className="font-bold text-right">{extractedData.number || 'N/A'}</span>
                    <span className="text-muted-foreground font-medium text-emerald-700">Total TTC:</span>
                    <span className="font-bold text-right text-emerald-700">{extractedData.amountTTC.toLocaleString()} {extractedData.currency || company?.currency}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="w-full gap-2" onClick={handleSave}>
                    <Save size={16} />
                    Enregistrer en comptabilité
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                    Corriger les données
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 h-[200px]">
                <FileText className="text-muted-foreground/40" size={48} />
                <p className="text-xs text-muted-foreground">Les données apparaîtront ici après l'analyse.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
        <AlertCircle className="text-blue-500 shrink-0" size={20} />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-900">Comment ça marche ?</p>
          <p className="text-xs text-blue-800/70 leading-relaxed">
            Notre IA analyse visuellement vos documents pour identifier les champs clés. 
            Elle apprend de vos corrections pour devenir plus précise à chaque utilisation. 
            Les documents sont traités en toute sécurité et ne sont jamais partagés.
          </p>
        </div>
      </div>
    </div>
  );
}
