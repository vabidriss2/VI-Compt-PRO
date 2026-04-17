import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Search, Filter, ClipboardCheck, Loader2, FileText, Paperclip, MessageSquare, ChevronRight, Download, Printer, User, Calendar, ArrowRight, Upload, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { toast } from 'sonner';

export default function Revisions() {
  const { userData } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('checklist');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/revisions`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (all.length === 0) {
        const initialPoints = [
          { category: 'Immobilisations', point: 'Amortissements pratiqués', status: 'ok', comment: 'Vérifié le 10/04', preparer: 'Jean D.', reviewer: 'Marie L.' },
          { category: 'Tiers', point: 'Comptes créditeurs clients', status: 'warning', comment: '3 comptes à lettrer', preparer: 'Jean D.', reviewer: null },
          { category: 'Trésorerie', point: 'Rapprochement bancaire', status: 'ok', comment: 'À jour', preparer: 'Jean D.', reviewer: 'Marie L.' },
          { category: 'Fiscalité', point: 'Cadrage TVA', status: 'error', comment: 'Écart de 12.50€ identifié', preparer: 'Jean D.', reviewer: null },
          { category: 'Social', point: 'Cadrage DSN / Comptabilité', status: 'ok', comment: 'Conforme au trimestre', preparer: 'Jean D.', reviewer: 'Marie L.' },
          { category: 'Stocks', point: 'Valorisation inventaire', status: 'warning', comment: 'En attente du PV d\'inventaire', preparer: 'Jean D.', reviewer: null }
        ];
        initialPoints.forEach(async (p) => {
          await addDoc(collection(db, `companies/${userData.companyId}/revisions`), {
            ...p,
            companyId: userData.companyId,
            createdAt: serverTimestamp()
          });
        });
      }
      setRevisions(all);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/revisions`);
    });

    return () => unsubscribe();
  }, [userData]);

  const progress = revisions.length > 0 ? Math.round((revisions.filter(r => r.status === 'ok').length / revisions.length) * 100) : 0;

  const handleRunRevision = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Cycle de révision terminé. 2 nouvelles anomalies détectées.');
    } catch (error) {
      toast.error('Erreur lors du cycle de révision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Révisions</h1>
          <p className="text-muted-foreground">Contrôlez la qualité comptable et préparez vos clôtures annuelles.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer size={14} /> Imprimer Dossier
          </Button>
          <Button size="sm" className="gap-2" onClick={handleRunRevision} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={14} /> : <ClipboardCheck size={14} />}
            Lancer Cycle de Révision
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Points Validés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">{revisions.filter(r => r.status === 'ok').length}</div>
            <p className="text-[10px] text-emerald-600/70 mt-1">Conformité assurée</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">À Vérifier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-700">{revisions.filter(r => r.status === 'warning').length}</div>
            <p className="text-[10px] text-amber-600/70 mt-1">Actions requises</p>
          </CardContent>
        </Card>
        <Card className="border-rose-100 bg-rose-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-700">{revisions.filter(r => r.status === 'error').length}</div>
            <p className="text-[10px] text-rose-600/70 mt-1">Blocages identifiés</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase font-bold text-primary tracking-wider">Progression Dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-black text-primary">{progress}%</div>
            <Progress value={progress} className="h-1.5" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="checklist" className="gap-2">
              <ClipboardCheck size={14} /> Programme de Travail
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <Paperclip size={14} /> Justificatifs
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Calendar size={14} /> Historique des Cycles
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrer les points..." className="pl-9 h-9 w-64 bg-white" />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Filter size={16} />
            </Button>
          </div>
        </div>

        <TabsContent value="checklist" className="m-0">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-bold">Catégorie</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Point de Contrôle</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Statut</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Préparateur / Réviseur</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map(p => (
                    <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-slate-900">{p.point}</span>
                          <span className="text-[10px] text-muted-foreground line-clamp-1 italic">{p.comment}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.status === 'ok' && (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                            <CheckCircle2 size={14} /> Conforme
                          </div>
                        )}
                        {p.status === 'warning' && (
                          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                            <AlertCircle size={14} /> À vérifier
                          </div>
                        )}
                        {p.status === 'error' && (
                          <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                            <AlertCircle size={14} /> Anomalie
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                                  <User size={10} /> {p.preparer}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Préparateur</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {p.reviewer ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={10} /> {p.reviewer}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Réviseur (Validé)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">En attente revue</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger variant="ghost" size="sm" className="h-8 gap-2" onClick={() => setSelectedPoint(p)}>
                            Détails <ChevronRight size={14} />
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <ClipboardCheck className="text-primary" />
                                {p.point}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-6 py-4">
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Catégorie</Label>
                                  <p className="text-sm font-bold">{p.category}</p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Description du contrôle</Label>
                                  <p className="text-xs text-slate-600 leading-relaxed">
                                    Vérification de la concordance entre les écritures comptables et les pièces justificatives. 
                                    Analyse des écarts éventuels et justification des soldes.
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Statut actuel</Label>
                                  <div className="flex gap-2">
                                    <Badge variant={p.status === 'ok' ? 'default' : 'outline'} className={cn(p.status === 'ok' && "bg-emerald-500")}>Conforme</Badge>
                                    <Badge variant={p.status === 'warning' ? 'default' : 'outline'} className={cn(p.status === 'warning' && "bg-amber-500")}>À vérifier</Badge>
                                    <Badge variant={p.status === 'error' ? 'destructive' : 'outline'}>Anomalie</Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Commentaire de révision</Label>
                                  <Textarea placeholder="Saisissez vos conclusions..." className="text-xs min-h-[100px]" defaultValue={p.comment} />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Justificatifs</Label>
                                  <div className="border rounded-lg p-3 flex items-center justify-between bg-slate-50">
                                    <div className="flex items-center gap-2">
                                      <FileText size={16} className="text-blue-500" />
                                      <span className="text-xs font-medium">PV_Inventaire_2024.pdf</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6"><Download size={12} /></Button>
                                  </div>
                                  <Button variant="outline" size="sm" className="w-full gap-2 border-dashed">
                                    <Paperclip size={14} /> Ajouter un document
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline">Annuler</Button>
                              <Button>Enregistrer les modifications</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-dashed border-2 flex flex-col items-center justify-center p-12 text-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="text-primary" size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-bold">Déposer un justificatif</p>
                <p className="text-xs text-muted-foreground">PDF, Excel, Images (Max 20MB)</p>
              </div>
            </Card>
            {revisions.filter(r => r.status === 'ok').map(p => (
              <Card key={p.id} className="group hover:border-primary/30 transition-all shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="text-blue-500" size={20} />
                    </div>
                    <Badge variant="secondary" className="text-[8px] uppercase">{p.category}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold line-clamp-1">Justificatif - {p.point}</p>
                    <p className="text-[10px] text-muted-foreground">Ajouté le 12/04/2024 par {p.preparer}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[10px] font-medium text-slate-400">1.2 MB • PDF</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye size={12} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download size={12} /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="text-emerald-500" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Prêt pour la clôture ?</h3>
            <p className="text-slate-400 text-xs">Une fois tous les points validés, vous pourrez générer le dossier de révision complet.</p>
          </div>
        </div>
        <Button size="lg" className="gap-2 px-8 font-bold bg-emerald-600 hover:bg-emerald-700" disabled={progress < 100}>
          Générer Dossier Annuel <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  );
}
