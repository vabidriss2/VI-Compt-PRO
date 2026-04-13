import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
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

const SidebarItem = ({ icon: Icon, label, to, active, collapsed }: any) => (
  <Link
    to={to}
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

const SidebarGroup = ({ label, items, collapsed, pathname }: any) => {
  const [isOpen, setIsOpen] = useState(true);
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    {
      label: "8. ADMINISTRATION",
      items: [
        { icon: UserCog, label: 'Utilisateurs & Droits', to: '/users' },
        { icon: Database, label: 'Sauvegarde', to: '/backup' },
        { icon: History, label: 'Historique des actions', to: '/audit' },
        { icon: Settings, label: 'Paramètres', to: '/settings' },
      ]
    }
  ];

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-72"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b h-16">
          {!collapsed && (
            <div className="flex items-center gap-2 font-bold text-xl text-primary truncate">
              <Building2 size={24} className="shrink-0" />
              <span className="truncate">VI Compt PRO</span>
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

        <div className="p-4 border-top">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10", collapsed && "justify-center px-2")}
            onClick={handleLogout}
          >
            <LogOut size={20} />
            {!collapsed && <span>Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="fixed inset-y-0 left-0 w-64 bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 font-bold text-xl text-primary">
                <Building2 size={24} />
                <span>VI Compt PRO</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <nav className="space-y-6">
              {menuGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          location.pathname === item.to 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon size={18} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={20} />
            </Button>
            <div className="hidden md:block">
              <h2 className="text-sm font-medium text-muted-foreground">
                {company?.name || 'Chargement...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold">{userData?.displayName || 'Utilisateur'}</span>
              <span className="text-xs text-muted-foreground capitalize">{userData?.role?.replace('_', ' ')}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {userData?.displayName?.[0] || 'U'}
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
