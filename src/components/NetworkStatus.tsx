import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';

export function NetworkStatus() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4">
      <WifiOff size={16} />
      <span>Mode hors-ligne</span>
    </div>
  );
}
