import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, RefreshCw, CheckCircle2, Clock, Shield } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { downloadCSV } from '../lib/download-utils';

export default function Backup() {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleDownloadBackup = (date: string) => {
    const data = [
      { Date: date, Status: 'Success', Size: '4.2 MB', Type: 'Full Backup' }
    ];
    downloadCSV(data, `Backup_${date.replace(/[/ :]/g, '_')}`);
  };

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sauvegarde</h1>
          <p className="text-muted-foreground">Gérez vos sauvegardes de données et assurez la sécurité de votre comptabilité.</p>
        </div>
        <Button className="gap-2" onClick={handleBackup} disabled={isBackingUp}>
          <Database size={18} /> 
          {isBackingUp ? "Sauvegarde en cours..." : "Sauvegarder maintenant"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Historique des sauvegardes</CardTitle>
            <CardDescription>Sauvegardes automatiques quotidiennes et manuelles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Heure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Taille</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">13/04/2026 03:00</TableCell>
                  <TableCell><Badge variant="secondary">Automatique</Badge></TableCell>
                  <TableCell>4.2 MB</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleDownloadBackup('13/04/2026 03:00')}><Download size={14} /> Télécharger</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">12/04/2026 03:00</TableCell>
                  <TableCell><Badge variant="secondary">Automatique</Badge></TableCell>
                  <TableCell>4.1 MB</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleDownloadBackup('12/04/2026 03:00')}><Download size={14} /> Télécharger</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <Shield size={18} />
              Sécurité Cloud
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-blue-600 leading-relaxed">
              Vos données sont automatiquement répliquées sur 3 centres de données distincts pour une tolérance aux pannes maximale.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <RefreshCw size={14} className="animate-spin-slow" />
              Dernière synchro : il y a 5 min
            </div>
            <Button variant="outline" size="sm" className="w-full text-blue-700 border-blue-300 hover:bg-blue-100">
              Restaurer une version
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
