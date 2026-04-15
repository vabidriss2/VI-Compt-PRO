import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, FileText, Save, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Badge } from '@/components/ui/badge';

interface TemplateLine {
  accountId: string;
  description: string;
  defaultDebit: number;
  defaultCredit: number;
}

export default function EntryTemplates() {
  const { userData } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<TemplateLine[]>([
    { accountId: '', description: '', defaultDebit: 0, defaultCredit: 0 },
    { accountId: '', description: '', defaultDebit: 0, defaultCredit: 0 }
  ]);

  useEffect(() => {
    if (!userData?.companyId) return;

    const qTemplates = query(collection(db, `companies/${userData.companyId}/entry_templates`));
    const unsubscribeTemplates = onSnapshot(qTemplates, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/entry_templates`);
    });

    const qAccounts = query(collection(db, `companies/${userData.companyId}/accounts`));
    const unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/accounts`);
    });

    return () => {
      unsubscribeTemplates();
      unsubscribeAccounts();
    };
  }, [userData]);

  const addLine = () => {
    setLines([...lines, { accountId: '', description: '', defaultDebit: 0, defaultCredit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof TemplateLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleAdd = async () => {
    if (!name || lines.some(l => !l.accountId)) {
      toast.error("Veuillez remplir le nom et sélectionner les comptes pour chaque ligne.");
      return;
    }

    setLoading(true);
    try {
      const newTemplate = { 
        name, 
        description, 
        lines,
        createdAt: new Date().toISOString(),
        companyId: userData!.companyId
      };
      const docRef = await addDoc(collection(db, `companies/${userData!.companyId}/entry_templates`), newTemplate);
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'entry_templates', docRef.id, newTemplate);
      
      toast.success("Modèle de saisie créé avec succès !");
      setIsAddOpen(false);
      resetForm();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `companies/${userData!.companyId}/entry_templates`);
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, `companies/${userData!.companyId}/entry_templates`, id));
      await logAction(userData!.companyId, userData!.uid, 'DELETE', 'entry_templates', id, {});
      toast.success("Modèle supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLines([
      { accountId: '', description: '', defaultDebit: 0, defaultCredit: 0 },
      { accountId: '', description: '', defaultDebit: 0, defaultCredit: 0 }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modèles de Saisie</h1>
          <p className="text-muted-foreground">Automatisez vos écritures répétitives en définissant des schémas pré-remplis.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="gap-2"><Plus size={18} /> Nouveau Modèle</Button>} />
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Configurer un nouveau modèle</DialogTitle>
              <DialogDescription>Définissez les comptes et libellés par défaut pour ce modèle.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du modèle</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Loyer Mensuel" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="ex: Écriture récurrente de loyer" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase text-muted-foreground">Lignes du modèle</Label>
                <div className="space-y-2">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded-lg bg-muted/30">
                      <div className="col-span-4">
                        <Select value={line.accountId} onValueChange={(v) => updateLine(index, 'accountId', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Compte" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>{acc.code} - {acc.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input 
                          placeholder="Libellé par défaut" 
                          className="h-8 text-xs"
                          value={line.description} 
                          onChange={(e) => updateLine(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1.5">
                        <Input 
                          type="number" 
                          placeholder="Débit"
                          className="h-8 text-xs text-right"
                          value={line.defaultDebit || ''} 
                          onChange={(e) => updateLine(index, 'defaultDebit', Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-1.5">
                        <Input 
                          type="number" 
                          placeholder="Crédit"
                          className="h-8 text-xs text-right"
                          value={line.defaultCredit || ''} 
                          onChange={(e) => updateLine(index, 'defaultCredit', Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(index)}>
                          <Trash2 size={14} className="text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addLine} className="w-full border-dashed">
                    <Plus size={14} className="mr-2" /> Ajouter une ligne
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Annuler</Button>
              <Button onClick={handleAdd} disabled={loading}>
                {loading ? "Enregistrement..." : "Créer le modèle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <Card key={t.id} className="group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <FileText size={20} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Edit size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
              <CardTitle className="mt-4 text-lg">{t.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-[40px]">{t.description || "Aucune description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mt-2">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Schéma d'écriture</p>
                <div className="space-y-1">
                  {t.lines?.slice(0, 3).map((l: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b last:border-0 border-muted/50">
                      <span className="font-mono text-primary">{accounts.find(a => a.id === l.accountId)?.code || '????'}</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">{l.description || "Sans libellé"}</span>
                      <div className="flex gap-2 font-bold">
                        {l.defaultDebit > 0 && <span className="text-emerald-600">D</span>}
                        {l.defaultCredit > 0 && <span className="text-rose-600">C</span>}
                      </div>
                    </div>
                  ))}
                  {t.lines?.length > 3 && (
                    <p className="text-[10px] text-center text-muted-foreground pt-1">+{t.lines.length - 3} autres lignes</p>
                  )}
                </div>
              </div>
              <Button variant="outline" className="w-full mt-6 gap-2 text-xs font-bold" onClick={() => toast.info("Utilisez ce modèle dans la page 'Saisie Comptable'")}>
                <Copy size={14} /> Utiliser ce modèle
              </Button>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl space-y-4">
            <div className="p-4 bg-muted rounded-full w-fit mx-auto">
              <FileText size={32} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold">Aucun modèle défini</p>
              <p className="text-sm text-muted-foreground">Commencez par créer un modèle pour vos écritures récurrentes.</p>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>Créer mon premier modèle</Button>
          </div>
        )}
      </div>
    </div>
  );
}
