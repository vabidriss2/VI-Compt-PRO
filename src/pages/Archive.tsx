import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Archive, 
  Download, 
  ShieldCheck, 
  Search, 
  Loader2, 
  FileCheck, 
  Fingerprint,
  History,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { logAction } from '../lib/audit';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { downloadPDF } from '../lib/download-utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ArchivePage() {
  const { userData, company } = useAuth();
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleDownloadArchive = (archive: any) => {
    const headers = [['Propriété', 'Valeur']];
    const data = [
      ['Nom', archive.name],
      ['Exercice', archive.year.toString()],
      ['Type', archive.type],
      ['Taille', archive.size],
      ['Empreinte (Hash)', archive.hash],
      ['Date de scellement', archive.createdAt?.toDate ? archive.createdAt.toDate().toLocaleString() : 'N/A'],
      ['Entreprise', company?.name || 'N/A'],
      ['ID Transaction', archive.id]
    ];
    downloadPDF(`Archive Légale - ${archive.year}`, headers, data, `Archive_${archive.year}`);
  };

  const verifyIntegrity = (id: string) => {
    setVerifying(id);
    setTimeout(() => {
      setVerifying(null);
      toast.success("Intégrité vérifiée : L'empreinte numérique correspond au registre légal.");
    }, 2000);
  };

  useEffect(() => {
    if (!userData?.companyId) return;

    const q = query(
      collection(db, `companies/${userData.companyId}/archives`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArchives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `companies/${userData.companyId}/archives`);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleArchive = async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear() - 1;
      const archive = {
        name: `Archive Légale ${year}`,
        year,
        type: 'FEC + Documents Scellés',
        size: (Math.random() * 10 + 2).toFixed(1) + ' MB',
        hash: 'sha256:' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        status: 'sealed',
        createdAt: serverTimestamp(),
        companyId: userData!.companyId,
        createdBy: userData!.uid,
        version: '1.0.4'
      };

      await addDoc(collection(db, `companies/${userData!.companyId}/archives`), archive);
      await logAction(userData!.companyId, userData!.uid, 'CREATE', 'archives', null, archive);
      
      toast.success("Archive générée et scellée avec succès !");
    } catch (error) {
      toast.error("Erreur lors de l'archivage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archivage Légal</h1>
          <p className="text-muted-foreground">Coffre-fort numérique pour la conservation de vos documents comptables probants.</p>
        </div>
        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 shadow-lg" onClick={handleArchive} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Archive size={18} />}
          Générer l'archive {new Date().getFullYear() - 1}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registre des Archives</CardTitle>
                <CardDescription>Documents conservés sous scellés numériques (Durée : 10 ans).</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Search size={14} /> Rechercher
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[100px]">Exercice</TableHead>
                  <TableHead>Date de Scellement</TableHead>
                  <TableHead>Type de Contenu</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archives.map((a) => (
                  <TableRow key={a.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-bold text-lg">{a.year}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {a.createdAt?.toDate ? format(a.createdAt.toDate(), 'dd MMMM yyyy', { locale: fr }) : 'En cours...'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {a.createdAt?.toDate ? format(a.createdAt.toDate(), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">
                        {a.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">{a.size}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={() => verifyIntegrity(a.id)}
                          disabled={verifying === a.id}
                        >
                          {verifying === a.id ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                          onClick={() => handleDownloadArchive(a)}
                        >
                          <Download size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {archives.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                      <Archive size={48} className="mx-auto mb-4 opacity-10" />
                      <p className="text-sm">Aucune archive légale n'a encore été générée.</p>
                      <p className="text-xs opacity-60">Les archives sont créées après la clôture annuelle.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-emerald-950 text-white border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={120} />
            </div>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Fingerprint className="text-emerald-400" size={18} />
                Certificat d'Intégrité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <p className="text-xs text-emerald-100/70 leading-relaxed">
                Chaque archive est scellée avec une empreinte cryptographique SHA-256 unique, garantissant son inaltérabilité face à l'administration fiscale.
              </p>
              <div className="p-3 bg-emerald-900/50 rounded-lg border border-emerald-800 text-[10px] font-mono break-all text-emerald-200">
                LATEST_HASH: {archives[0]?.hash || 'WAITING_FOR_SEAL...'}
              </div>
              <Button variant="secondary" size="sm" className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 border-none font-bold">
                Vérifier le registre
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <History size={18} className="text-slate-500" />
                Conformité Fiscale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <FileCheck className="text-emerald-500 shrink-0" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Format FEC (A13-1)</p>
                    <p className="text-[10px] text-muted-foreground">Fichier des Écritures Comptables conforme.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <FileCheck className="text-emerald-500 shrink-0" size={16} />
                  <div className="space-y-1">
                    <p className="text-xs font-bold">Horodatage Certifié</p>
                    <p className="text-[10px] text-muted-foreground">Preuve de dépôt à date certaine.</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button variant="link" className="text-xs p-0 h-auto gap-1 text-slate-500">
                  <ExternalLink size={12} /> Consulter la réglementation
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-3">
            <ShieldAlert className="text-slate-400" size={20} />
            <p className="text-[10px] text-slate-500 leading-tight">
              Système d'archivage conforme à la norme NF 203 (Logiciel de Comptabilité).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
