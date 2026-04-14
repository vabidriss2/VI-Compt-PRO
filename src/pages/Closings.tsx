import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, where, doc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, CheckCircle2, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

export default function Closings() {
  const { userData } = useAuth();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/periods`),
      orderBy('month', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If no periods exist, initialize some
      if (all.length === 0) {
        const initialMonths = ['2024-01', '2024-02', '2024-03', '2024-04'];
        initialMonths.forEach(async (month) => {
          await setDoc(doc(db, `companies/${userData.companyId}/periods`, month), {
            month,
            status: 'open',
            companyId: userData.companyId
          });
        });
      }
      setPeriods(all);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/periods`);
    });

    return () => unsubscribe();
  }, [userData]);

  const togglePeriod = async (period: any) => {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clôtures Périodiques</h1>
          <p className="text-muted-foreground">Verrouillez vos périodes comptables pour empêcher toute modification.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>État des périodes</CardTitle>
            <CardDescription>L'exercice en cours est 2024.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periods.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      m.status === 'closed' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {m.status === 'closed' ? <Lock size={20} /> : <Unlock size={20} />}
                    </div>
                    <div>
                      <p className="font-bold">{m.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.status === 'closed' ? `Clôturé le ${new Date(m.closedAt).toLocaleDateString()}` : "Période ouverte"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={m.status === 'closed' ? 'default' : 'outline'}>
                      {m.status === 'closed' ? 'Verrouillé' : 'Ouvert'}
                    </Badge>
                    <Button 
                      variant={m.status === 'closed' ? 'ghost' : 'default'} 
                      size="sm"
                      onClick={() => togglePeriod(m)}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (m.status === 'closed' ? "Réouvrir" : "Clôturer")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conseils de clôture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-sm">
              <CheckCircle2 className="text-green-500 shrink-0" size={16} />
              <span>Vérifiez que toutes les écritures sont validées (pas de brouillard).</span>
            </div>
            <div className="flex gap-3 text-sm">
              <CheckCircle2 className="text-green-500 shrink-0" size={16} />
              <span>Le rapprochement bancaire doit être à jour.</span>
            </div>
            <div className="flex gap-3 text-sm">
              <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              <span>Une période clôturée ne peut plus être modifiée sans réouverture.</span>
            </div>
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full gap-2">
                <Calendar size={16} /> Clôture annuelle 2023
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
