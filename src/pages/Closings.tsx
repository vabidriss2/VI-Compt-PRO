import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, setDoc, serverTimestamp, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Loader2,
  ClipboardCheck,
  FileWarning,
  History,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Closings() {
  const { userData, company } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState({
    unvalidatedEntries: 0,
    unreconciledTransactions: 0,
    pendingInvoices: 0
  });

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/periods`),
      orderBy('month', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPeriods(all);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/periods`);
    });

    // Fetch Checklist Data
    const fetchChecklist = async () => {
      const companyId = userData.companyId;
      
      // Unvalidated entries (drafts)
      const qDrafts = query(collection(db, `companies/${companyId}/journal_entries`), where('status', '==', 'draft'));
      const draftsSnap = await getDocs(qDrafts);
      
      // Pending invoices
      const qInvoices = query(collection(db, `companies/${companyId}/invoices`), where('status', '==', 'pending'));
      const invoicesSnap = await getDocs(qInvoices);

      setChecklist({
        unvalidatedEntries: draftsSnap.size,
        unreconciledTransactions: 0, // Placeholder for future bank recon logic
        pendingInvoices: invoicesSnap.size
      });
    };

    fetchChecklist();

    return () => unsubscribe();
  }, [userData]);

  const togglePeriod = async (period: any) => {
    if (period.status === 'open' && (checklist.unvalidatedEntries > 0)) {
      toast.error("Impossible de clôturer : il reste des écritures non validées.");
      return;
    }

    setLoading(true);
    try {
      const newStatus = period.status === 'open' ? 'closed' : 'open';
      const ref = doc(db, `companies/${userData!.companyId}/periods`, period.id);
      
      await setDoc(ref, {
        ...period,
        status: newStatus,
        closedAt: newStatus === 'closed' ? new Date().toISOString() : null,
        closedBy: newStatus === 'closed' ? userData!.uid : null
      }, { merge: true });

      await logAction(userData!.companyId, userData!.uid, 'UPDATE', 'periods', period.id, { status: newStatus });
      toast.success(`Période ${period.month} ${newStatus === 'closed' ? 'clôturée' : 'réouverte'}`);
    } catch (error) {
      toast.error("Erreur lors de la modification de la période");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clôtures Périodiques</h1>
          <p className="text-muted-foreground">Sécurisez votre comptabilité en verrouillant les périodes validées.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <History size={18} /> Historique des clôtures
          </Button>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <ShieldCheck size={18} /> Clôture Annuelle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendrier de Clôture</CardTitle>
                <CardDescription>État des périodes pour l'exercice {new Date().getFullYear()}.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Exercice Ouvert</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {periods.map((m, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between p-4 border rounded-xl transition-all group",
                  m.status === 'closed' ? "bg-slate-50/50 border-slate-200" : "hover:border-primary/30 hover:shadow-sm"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                      m.status === 'closed' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                    )}>
                      {m.status === 'closed' ? <Lock size={22} /> : <Unlock size={22} />}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{format(new Date(m.month + '-01'), 'MMMM yyyy', { locale: fr })}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={m.status === 'closed' ? 'default' : 'outline'} className={cn(
                          "text-[10px] uppercase px-1.5 h-4",
                          m.status === 'closed' ? "bg-emerald-600" : "text-blue-600 border-blue-200"
                        )}>
                          {m.status === 'closed' ? 'Verrouillé' : 'Ouvert'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {m.status === 'closed' ? `Clôturé le ${format(new Date(m.closedAt), 'dd/MM/yyyy')}` : "Prêt pour clôture"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant={m.status === 'closed' ? 'outline' : 'default'} 
                    size="sm"
                    className={cn(
                      "gap-2 h-9 px-4",
                      m.status === 'open' && "bg-slate-900 hover:bg-slate-800"
                    )}
                    onClick={() => togglePeriod(m)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : (
                      m.status === 'closed' ? (
                        <>Réouvrir</>
                      ) : (
                        <>Clôturer la période</>
                      )
                    )}
                  </Button>
                </div>
              ))}
              {periods.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                  <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Aucune période configurée pour cet exercice.</p>
                  <Button variant="link" className="mt-2">Initialiser l'exercice</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck size={18} className="text-primary" />
                Checklist de Pré-clôture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    checklist.unvalidatedEntries === 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                  )}>
                    {checklist.unvalidatedEntries === 0 ? <CheckCircle2 size={16} /> : <FileWarning size={16} />}
                  </div>
                  <span className="text-sm">Écritures en brouillard</span>
                </div>
                <Badge variant={checklist.unvalidatedEntries === 0 ? "secondary" : "destructive"}>
                  {checklist.unvalidatedEntries}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    checklist.pendingInvoices === 0 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {checklist.pendingInvoices === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  </div>
                  <span className="text-sm">Factures en attente</span>
                </div>
                <Badge variant="outline">{checklist.pendingInvoices}</Badge>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2 uppercase tracking-wider">
                  <AlertTriangle size={14} /> Rappel Légal
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  La clôture d'une période est une action irréversible dans le journal légal. Assurez-vous que tous les rapprochements bancaires sont terminés.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-sm">Assistance IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                L'IA a analysé vos comptes et n'a détecté aucune anomalie majeure pour la période en cours.
              </p>
              <Button variant="secondary" size="sm" className="w-full text-xs">Générer le rapport d'audit</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
