import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, AlertTriangle, Clock } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuGroup,
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markAsRead, markAllAsRead, checkAndGenerateNotifications, Notification } from '../lib/notifications';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const NotificationBell = () => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);

  useEffect(() => {
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount]);

  useEffect(() => {
    if (!userData?.companyId) return;

    // Run a check for new notifications on mount
    checkAndGenerateNotifications(userData.companyId);

    const unsubscribe = subscribeToNotifications(userData.companyId, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => n.status === 'unread').length);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleMarkAllRead = () => {
    if (!userData?.companyId) return;
    const unreadIds = notifications.filter(n => n.status === 'unread').map(n => n.id!);
    if (unreadIds.length > 0) {
      markAllAsRead(userData.companyId, unreadIds);
    }
  };

  const handleMarkRead = (id: string) => {
    if (!userData?.companyId) return;
    markAsRead(userData.companyId, id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'invoice_due': return <Clock className="text-amber-500" size={16} />;
      case 'invoice_overdue': return <AlertTriangle className="text-rose-500" size={16} />;
      case 'payment_reminder': return <Info className="text-blue-500" size={16} />;
      default: return <Bell className="text-slate-500" size={16} />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger variant="ghost" size="icon" className="relative">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-4 flex items-center justify-between">
            <span className="text-sm font-bold">Notifications</span>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                onClick={handleMarkAllRead}
              >
                Tout marquer comme lu
              </Button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id}
                  className={cn(
                    "p-4 border-b last:border-0 hover:bg-accent transition-colors cursor-pointer flex gap-3",
                    n.status === 'unread' && "bg-primary/5"
                  )}
                  onClick={() => handleMarkRead(n.id!)}
                >
                  <div className="mt-1 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm leading-none", n.status === 'unread' ? "font-bold" : "font-medium")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {n.createdAt?.toDate ? format(n.createdAt.toDate(), 'PPp', { locale: fr }) : 'À l\'instant'}
                    </p>
                  </div>
                  {n.status === 'unread' && (
                    <div className="mt-1 shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <Bell className="text-muted-foreground/20 mb-2" size={32} />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
            Voir tout l'historique
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
