import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', balance: 12000 },
  { name: 'Feb', balance: 15000 },
  { name: 'Mar', balance: 13500 },
  { name: 'Apr', balance: 18000 },
  { name: 'May', balance: 22000 },
  { name: 'Jun', balance: 21000 },
];

import { downloadPDF } from '../lib/download-utils';

export default function CashFlow() {
  const handleDownloadReport = () => {
    const headers = [['Mois', 'Solde']];
    const chartData = data.map(d => [d.name, d.balance.toLocaleString()]);
    downloadPDF('Rapport de Trésorerie', headers, chartData, 'Tresorerie_Report');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suivi Trésorerie</h1>
          <p className="text-muted-foreground">Visualisez et anticipez vos flux de trésorerie.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleDownloadReport}><Download size={18} /> Rapport complet</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disponible actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">21 000,00 €</div>
            <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
              <TrendingUp size={12} /> +12% vs mois dernier
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Encaissements prévus (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">+8 450,00 €</div>
            <p className="text-xs text-muted-foreground mt-1">Basé sur les échéanciers clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Décaissements prévus (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">-4 200,00 €</div>
            <p className="text-xs text-muted-foreground mt-1">Basé sur les échéanciers fournisseurs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution de la trésorerie</CardTitle>
          <CardDescription>Historique et prévisionnel sur 6 mois.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] pt-4 w-full min-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="balance" stroke="#0f172a" fillOpacity={1} fill="url(#colorBalance)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
