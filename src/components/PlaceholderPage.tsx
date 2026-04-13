import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="p-6 bg-primary/10 rounded-full text-primary">
        <Construction size={48} />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Cette page est en cours de développement. Elle fera partie du module complet de gestion comptable.
      </p>
    </div>
  );
}
