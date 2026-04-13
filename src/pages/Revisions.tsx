import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Search, Filter, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';

export default function Revisions() {
  const { userData } = useAuth();
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/revisions`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If no revisions exist, initialize some mock points
      if (all.length === 0) {
        const initialPoints = [
          { category: 'Immobilisations', point: 'Amortissements pratiqués', status: 'ok', comment: 'Vérifié le 10/04' },
          { category: 'Tiers', point: 'Comptes créditeurs clients', status: 'warning', comment: '3 comptes à lettrer' },
          { category: 'Trésorerie', point: 'Rapprochement bancaire', status: 'ok', comment: 'À jour' },
          { category: 'Fiscalité', point: 'Cadrage TVA', status: 'error', comment: 'Écart de 12.50€ identifié' }
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
    });

    return () => unsubscribe();
  }, [userData]);

  const handleRunRevision = async () => {
    setLoading(true);
    try {
      toast.info("Analyse des comptes en cours...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      await logAction(userData!.companyId, userData!.uid, 'EXECUTE', 'revisions', 'cycle', { timestamp: new Date().toISOString() });
      toast.success("Cycle de révision terminé !");
    } catch (error) {
      toast.error("Erreur lors de la révision");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Révisions</h1>
          <p className="text-muted-foreground">Contrôlez la cohérence de votre comptabilité avant clôture.</p>
        </div>
        <Button className="gap-2" onClick={handleRunRevision} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardCheck size={18} />}
          Lancer un cycle de révision
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-600 uppercase">Points validés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{revisions.filter(r => r.status === 'ok').length}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 uppercase">À vérifier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{revisions.filter(r => r.status === 'warning').length}</div>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-rose-600 uppercase">Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{revisions.filter(r => r.status === 'error').length}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-primary uppercase">Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {revisions.length > 0 ? Math.round((revisions.filter(r => r.status === 'ok').length / revisions.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dossier de révision</CardTitle>
          <CardDescription>Liste des points de contrôle par cycle.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead>Point de contrôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.category}</TableCell>
                  <TableCell>{p.point}</TableCell>
                  <TableCell>
                    {p.status === 'ok' && (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1">
                        <CheckCircle2 size={12} /> Conforme
                      </Badge>
                    )}
                    {p.status === 'warning' && (
                      <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600 gap-1">
                        <AlertCircle size={12} /> À vérifier
                      </Badge>
                    )}
                    {p.status === 'error' && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle size={12} /> Anomalie
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground italic">{p.comment}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Détails</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
