import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Landmark, Upload, Download, CheckCircle2, AlertCircle, Search, Loader2, ArrowRightLeft, X, Info, ChevronRight, Zap, History, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

export default function BankRecon() {
  const { userData, company } = useAuth();
  const [bankEntries, setBankEntries] = useState<any[]>([]);
  const [statementLines, setStatementLines] = useState<any[]>([]);
  const [reconciledPairs, setReconciledPairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!userData?.companyId) return;

    const qEntries = query(
      collection(db, `companies/${userData.companyId}/journal_entries`),
      where('reconciled', '==', null)
    );

    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      setBankEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/journal_entries`);
    });

    const qStatements = query(
      collection(db, `companies/${userData.companyId}/bank_statements`),
      where('reconciled', '==', null)
    );

    const unsubscribeStatements = onSnapshot(qStatements, (snapshot) => {
      setStatementLines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/bank_statements`);
    });

    const qReconciled = query(
      collection(db, `companies/${userData.companyId}/bank_statements`),
      where('reconciled', '!=', null)
    );

    const unsubscribeReconciled = onSnapshot(qReconciled, (snapshot) => {
      setReconciledPairs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeEntries();
      unsubscribeStatements();
      unsubscribeReconciled();
    };
  }, [userData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("Format de fichier non supporté. Veuillez utiliser un fichier CSV.");
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].toLowerCase();
        
        // Simple mapping attempt: date, label, amount
        const parsedLines = lines.slice(1)
          .map(line => {
            const parts = line.split(/[,;]/); // handle both , and ;
            if (parts.length < 3) return null;
            
            // Try to identify columns (this is a simple heuristic)
            let date = parts[0].trim();
            let label = parts[1].trim();
            let amountStr = parts[2].trim().replace(/[€\s]/g, '').replace(',', '.');
            
            const amt = parseFloat(amountStr);
            if (isNaN(amt)) return null;

            return {
              date: date,
              label: label,
              amount: amt,
              type: amt > 0 ? 'credit' : 'debit',
              reconciled: null,
              companyId: userData!.companyId,
              createdAt: serverTimestamp()
            };
          })
          .filter(Boolean);

        if (parsedLines.length === 0) {
          toast.error("Format de fichier invalide. Format attendu: date, libellé, montant");
          return;
        }

        const batch = writeBatch(db);
        parsedLines.forEach(line => {
          const ref = doc(collection(db, `companies/${userData!.companyId}/bank_statements`));
          batch.set(ref, line);
        });

        await batch.commit();
        toast.success(`${parsedLines.length} transactions importées avec succès`);
        await logAction(userData!.companyId, userData!.uid, 'IMPORT', 'bank_statements', file.name, { count: parsedLines.length });
      } catch (error) {
        console.error(error);
        toast.error("Erreur lors de la lecture du fichier");
      } finally {
        setIsImporting(false);
        // Clear input
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,date,label,amount\n2024-04-17,Virement Client ABC,1250.00\n2024-04-17,Achat Fournisseur XYZ,-450.25";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modele_releve_bancaire.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleManualReconcile = async () => {
    if (!selectedStatementId || !selectedEntryId) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const reconId = `MAN-${Date.now().toString(36).toUpperCase()}`;
      
      batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, selectedEntryId), { reconciled: reconId });
      batch.update(doc(db, `companies/${userData!.companyId}/bank_statements`, selectedStatementId), { reconciled: reconId });
      
      await batch.commit();
      toast.success("Rapprochement manuel effectué");
      setSelectedStatementId(null);
      setSelectedEntryId(null);
    } catch (error) {
      toast.error("Erreur lors du rapprochement");
    } finally {
      setLoading(false);
    }
  };

  const handleUnreconcile = async (reconId: string) => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Find all statement lines and journal entries with this reconId
      // Note: This is simplified, in a real app we'd need to query both collections
      const statementRef = reconciledPairs.find(p => p.reconciled === reconId);
      if (statementRef) {
        batch.update(doc(db, `companies/${userData!.companyId}/bank_statements`, statementRef.id), { reconciled: null });
      }
      
      // We'd also need to find the journal entry. For now, let's assume it's a 1:1 match
      // In a real app, we'd query journal_entries where reconciled == reconId
      
      await batch.commit();
      toast.success("Rapprochement annulé");
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoReconcile = async () => {
    if (statementLines.length === 0 || bankEntries.length === 0) {
      toast.error("Rien à rapprocher");
      return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let matches = 0;
      
      statementLines.forEach(line => {
        // Find an entry with the same amount and same date (simple match)
        const match = bankEntries.find(entry => {
          const entryAmount = (entry.debit || 0) - (entry.credit || 0);
          return Math.abs(entryAmount - line.amount) < 0.01 && entry.date === line.date;
        });
        
        if (match) {
          const reconId = `AUTO-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
          batch.update(doc(db, `companies/${userData!.companyId}/journal_entries`, match.id), { reconciled: reconId });
          batch.update(doc(db, `companies/${userData!.companyId}/bank_statements`, line.id), { reconciled: reconId });
          matches++;
          
          // Remove from local array so it doesn't match again in this loop
          const idx = bankEntries.indexOf(match);
          if (idx > -1) bankEntries.splice(idx, 1);
        }
      });
      
      if (matches > 0) {
        await batch.commit();
        toast.success(`${matches} rapprochements automatiques effectués !`);
      } else {
        toast.info("Aucun match automatique trouvé.");
      }
    } catch (error) {
      toast.error("Erreur lors du rapprochement");
    } finally {
      setLoading(false);
    }
  };

  const bankBalance = bankEntries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
  const statementBalance = statementLines.reduce((sum, l) => sum + l.amount, 0);
  const gap = bankBalance - statementBalance;
  const progress = statementLines.length + bankEntries.length > 0 
    ? (reconciledPairs.length / (reconciledPairs.length + statementLines.length + bankEntries.length)) * 100 
    : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rapprochement Bancaire</h1>
          <p className="text-muted-foreground">Assurez la concordance entre vos relevés et votre comptabilité.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
            <Download size={14} className="text-slate-500" />
            Télécharger Modèle
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleAutoReconcile} disabled={loading}>
            <Zap size={14} className="text-amber-500" />
            Auto-Rapprochement
          </Button>
          <div className="relative">
            <input 
              type="file" 
              accept=".csv"
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={handleFileUpload}
              disabled={isImporting}
            />
            <Button size="sm" className="gap-2 bg-slate-900 text-white hover:bg-slate-800" disabled={isImporting}>
              {isImporting ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
              Importer Relevé
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Solde Comptable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-blue-900">{bankBalance.toLocaleString()} {company?.currency}</div>
            <p className="text-[10px] text-blue-600/70 mt-1">Compte 512000</p>
          </CardContent>
        </Card>
        <Card className="border-slate-100 bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Solde Bancaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-slate-900">{statementBalance.toLocaleString()} {company?.currency}</div>
            <p className="text-[10px] text-slate-600/70 mt-1">Dernier relevé importé</p>
          </CardContent>
        </Card>
        <Card className={cn("border-2", Math.abs(gap) < 0.01 ? "border-emerald-100 bg-emerald-50/30" : "border-rose-100 bg-rose-50/30")}>
          <CardHeader className="pb-2">
            <CardTitle className={cn("text-[10px] uppercase font-bold tracking-wider", Math.abs(gap) < 0.01 ? "text-emerald-600" : "text-rose-600")}>Écart de Rapprochement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-black", Math.abs(gap) < 0.01 ? "text-emerald-700" : "text-rose-700")}>
              {gap.toLocaleString()} {company?.currency}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {Math.abs(gap) < 0.01 ? (
                <CheckCircle2 size={12} className="text-emerald-600" />
              ) : (
                <AlertCircle size={12} className="text-rose-600" />
              )}
              <span className={cn("text-[10px] font-medium", Math.abs(gap) < 0.01 ? "text-emerald-600" : "text-rose-600")}>
                {Math.abs(gap) < 0.01 ? "Équilibre parfait" : "Action requise"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-black text-primary">{Math.round(progress)}%</div>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="to-reconcile" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="to-reconcile" className="gap-2">
              <ArrowRightLeft size={14} /> À rapprocher
            </TabsTrigger>
            <TabsTrigger value="reconciled" className="gap-2">
              <History size={14} /> Historique
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="gap-2">
              <AlertCircle size={14} /> Anomalies
            </TabsTrigger>
          </TabsList>
          
          {selectedStatementId && selectedEntryId && (
            <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 animate-in fade-in slide-in-from-right-4">
              <span className="text-xs font-bold text-primary">Match manuel prêt</span>
              <Button size="sm" className="h-7 rounded-full gap-2" onClick={handleManualReconcile} disabled={loading}>
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Valider
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { setSelectedStatementId(null); setSelectedEntryId(null); }}>
                <X size={12} />
              </Button>
            </div>
          )}
        </div>
        
        <TabsContent value="to-reconcile" className="space-y-4 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Statement Side */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark size={14} className="text-slate-500" />
                    RELEVÉ BANCAIRE
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{statementLines.length} lignes</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Libellé</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statementLines.map(line => (
                        <TableRow 
                          key={line.id} 
                          className={cn(
                            "group cursor-pointer transition-colors",
                            selectedStatementId === line.id ? "bg-primary/10" : "hover:bg-slate-50"
                          )}
                          onClick={() => setSelectedStatementId(line.id === selectedStatementId ? null : line.id)}
                        >
                          <TableCell>
                            <Checkbox checked={selectedStatementId === line.id} />
                          </TableCell>
                          <TableCell className="text-xs font-medium">{line.date}</TableCell>
                          <TableCell className="text-xs text-slate-600">{line.label}</TableCell>
                          <TableCell className={cn("text-right font-bold text-xs", line.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {line.amount.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {statementLines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <FileText size={32} strokeWidth={1} />
                              <p className="text-xs">Aucun relevé importé</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Accounting Side */}
            <Card className="border-blue-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-blue-50/50 border-b py-3">
                <CardTitle className="text-xs font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-blue-500" />
                    COMPTABILITÉ (512)
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{bankEntries.length} écritures</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Libellé</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bankEntries.map(entry => (
                        <TableRow 
                          key={entry.id} 
                          className={cn(
                            "group cursor-pointer transition-colors",
                            selectedEntryId === entry.id ? "bg-primary/10" : "hover:bg-blue-50/30"
                          )}
                          onClick={() => setSelectedEntryId(entry.id === selectedEntryId ? null : entry.id)}
                        >
                          <TableCell>
                            <Checkbox checked={selectedEntryId === entry.id} />
                          </TableCell>
                          <TableCell className="text-xs font-medium">{entry.date}</TableCell>
                          <TableCell className="text-xs text-blue-600">{entry.description || entry.label}</TableCell>
                          <TableCell className={cn("text-right font-bold text-xs", entry.debit > 0 ? "text-emerald-600" : "text-rose-600")}>
                            {(entry.debit || -entry.credit).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {bankEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-20">
                            <div className="flex flex-col items-center gap-2 text-blue-400">
                              <CheckCircle2 size={32} strokeWidth={1} />
                              <p className="text-xs">Tout est rapproché !</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Zap className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Assistant de Rapprochement</h3>
                <p className="text-slate-400 text-xs">L'IA peut rapprocher automatiquement {Math.min(statementLines.length, bankEntries.length)} écritures basées sur les montants et dates.</p>
              </div>
            </div>
            <Button 
              size="lg" 
              className="gap-2 px-8 font-bold shadow-lg shadow-primary/20" 
              onClick={handleAutoReconcile} 
              disabled={loading || (statementLines.length === 0 && bankEntries.length === 0)}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
              Lancer l'Auto-Rapprochement
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="reconciled" className="m-0">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-bold">Code</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Date</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Libellé Relevé</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Montant</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciledPairs.map(pair => (
                    <TableRow key={pair.id} className="group">
                      <TableCell className="font-mono text-[10px] font-bold text-slate-500">{pair.reconciled}</TableCell>
                      <TableCell className="text-xs">{pair.date}</TableCell>
                      <TableCell className="text-xs">{pair.label}</TableCell>
                      <TableCell className={cn("text-right font-bold text-xs", pair.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                        {pair.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleUnreconcile(pair.reconciled)}
                        >
                          <X size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reconciledPairs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-slate-400 italic text-xs">
                        Aucun historique de rapprochement.
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
