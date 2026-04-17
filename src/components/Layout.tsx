import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  BarChart3, 
  Settings,
  Search,
  LogOut,
  Menu,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  Building2,
  Wallet,
  Sparkles,
  Percent,
  Layers,
  Users2,
  Activity,
  PieChart,
  ShieldCheck,
  Coins,
  Lock,
  UserCog,
  History,
  Database,
  Calendar,
  ClipboardList,
  Receipt,
  Landmark,
  Calculator,
  FileCheck,
  Archive,
  ArrowRightLeft,
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';
import CommandPalette from './CommandPalette';

const SidebarItem = ({ icon: Icon, label, to, active, collapsed, onClick }: any) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
      active 
        ? "bg-primary text-primary-foreground shadow-sm" 
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      collapsed && "justify-center px-2"
    )}
  >
    <Icon size={18} />
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
  </Link>
);

const SidebarGroup = ({ label, items, collapsed, pathname, onItemClick, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasActive = items.some((item: any) => pathname === item.to);

  if (collapsed) {
    return (
      <div className="py-2">
        {items.map((item: any) => (
          <SidebarItem
            key={item.to}
            {...item}
            active={pathname === item.to}
            collapsed={collapsed}
            onClick={onItemClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={cn("transition-transform", !isOpen && "-rotate-90")} />
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {items.map((item: any) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={pathname === item.to}
              collapsed={collapsed}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { userData, company } = useAuth();

  const menuGroups = [
    {
      label: "Général",
      items: [
        { icon: LayoutDashboard, label: 'Tableau de bord', to: '/' },
      ]
    },
    {
      label: "1. STRUCTURE",
      items: [
        { icon: BookOpen, label: 'Plan Comptable', to: '/accounts' },
        { icon: Layers, label: 'Plan Analytique', to: '/analytical-plans' },
        { icon: ClipboardList, label: 'Codes Journaux', to: '/journals' },
        { icon: Percent, label: 'Taux de Taxes', to: '/taxes' },
        { icon: FileText, label: 'Modèles de Saisie', to: '/entry-templates' },
        { icon: Landmark, label: 'Banques', to: '/banks' },
      ]
    },
    {
      label: "2. TIERS",
      items: [
        { icon: Users, label: 'Contacts (Clients/Fourn.)', to: '/contacts' },
        { icon: Calendar, label: 'Échéanciers', to: '/schedules' },
        { icon: Activity, label: 'Relances', to: '/reminders' },
      ]
    },
    {
      label: "3. TRAITEMENT",
      items: [
        { icon: Receipt, label: 'Saisie Comptable', to: '/entries' },
        { icon: FileText, label: 'Facturation', to: '/invoices' },
        { icon: Layers, label: 'Produits & Stock', to: '/products' },
        { icon: Sparkles, label: 'Importation (OCR)', to: '/import' },
        { icon: ArrowRightLeft, label: 'Lettrage', to: '/lettering' },
        { icon: Landmark, label: 'Rapprochement Banc.', to: '/bank-recon' },
        { icon: Edit2, label: 'Révisions', to: '/revisions' },
      ]
    },
    {
      label: "4. ÉTATS",
      items: [
        { icon: FileText, label: 'Brouillard', to: '/drafts' },
        { icon: BookOpen, label: 'Journaux', to: '/journal-reports' },
        { icon: Calculator, label: 'Balance', to: '/balance' },
        { icon: Wallet, label: 'Grand Livre', to: '/ledger' },
        { icon: PieChart, label: 'États de Gestion', to: '/management-reports' },
      ]
    },
    {
      label: "5. FISCALITÉ",
      items: [
        { icon: FileCheck, label: 'Déclarations TVA', to: '/vat' },
        { icon: FileText, label: 'Liasse Fiscale', to: '/tax-filing' },
        { icon: ShieldCheck, label: 'Génération FEC', to: '/fec' },
      ]
    },
    {
      label: "6. TRÉSORERIE",
      items: [
        { icon: Coins, label: 'Suivi Trésorerie', to: '/cash-flow' },
        { icon: ArrowRightLeft, label: 'Virements / Prélèvements', to: '/payments' },
      ]
    },
    {
      label: "7. CLÔTURE",
      items: [
        { icon: Lock, label: 'Clôtures Périodiques', to: '/closings' },
        { icon: Archive, label: 'Archivage Légal', to: '/archive' },
      ]
    },
    ...(userData?.role === 'admin' || userData?.role === 'super_admin' ? [
      {
        label: "8. ADMINISTRATION",
        items: [
          { icon: UserCog, label: 'Utilisateurs & Droits', to: '/users' },
          { icon: Database, label: 'Sauvegarde', to: '/backup' },
          { icon: History, label: 'Historique des actions', to: '/audit' },
          { icon: Settings, label: 'Paramètres', to: '/settings' },
        ]
      }
    ] : [])
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-72"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b h-16">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary truncate">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
                <Building2 size={20} className="shrink-0" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="truncate">VI Compt</span>
                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">PRO</span>
              </div>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
            {collapsed ? <ChevronRight size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          {menuGroups.map((group) => (
            <SidebarGroup
              key={group.label}
              label={group.label}
              items={group.items}
              collapsed={collapsed}
              pathname={location.pathname}
            />
          ))}
        </ScrollArea>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center px-2")}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {!collapsed && <span className="text-sm font-bold uppercase tracking-widest">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Sidebar Trigger */}
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu size={20} />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-72">
                <SheetHeader className="p-6 border-b">
                  <SheetTitle className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary">
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                      <Building2 size={20} />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span>VI Compt</span>
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest text-left">PRO</span>
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] p-4">
                  <nav className="space-y-2">
                    {menuGroups.map((group, index) => (
                      <SidebarGroup
                        key={group.label}
                        label={group.label}
                        items={group.items}
                        collapsed={false}
                        pathname={location.pathname}
                        defaultOpen={index === 0 || group.items.some((item: any) => location.pathname === item.to)}
                      />
                    ))}
                  </nav>
                  
                  <div className="mt-8 pt-6 border-t">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut size={20} />
                      <span className="text-sm font-bold uppercase tracking-widest">Déconnexion</span>
                    </Button>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="md:hidden flex items-center gap-2 font-bold text-lg tracking-tight text-primary">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <Building2 size={16} />
              </div>
              <span className="font-black tracking-tighter">VI Compt <span className="text-emerald-500 text-[10px]">PRO</span></span>
            </div>
            <div className="hidden md:block">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground bg-accent/50 px-3 py-1 rounded-full border border-border/50">
                🏢 {company?.name || 'VAB&IDRISS TECH'}
              </h2>
            </div>
            
            {/* Global Search Bar */}
            <div className="hidden lg:flex relative w-full max-w-md ml-8 group">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <div 
                className="w-full bg-muted/50 hover:bg-muted border border-transparent hover:border-border rounded-full py-2 pl-10 pr-12 text-sm text-muted-foreground cursor-pointer flex items-center justify-between transition-all"
                onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
              >
                <span>Rechercher une action ou un compte...</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black bg-background border px-1.5 py-0.5 rounded shadow-sm">
                  <span className="text-[8px] opacity-50 tracking-tighter">CTRL</span>K
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CommandPalette />
            <NotificationBell />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold">{userData?.displayName || 'Utilisateur'}</span>
              <span className="text-xs text-muted-foreground capitalize">{userData?.role?.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/settings" className="p-2 rounded-full hover:bg-accent transition-colors">
                <Settings size={20} className="text-muted-foreground" />
              </Link>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">
                {userData?.displayName?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/30">
          {children}
          
          <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-primary" />
              👉 VI Compt PRO – AI Powered Accounting by vab&idriss tech
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout;
