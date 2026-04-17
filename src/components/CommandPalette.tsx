import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { 
  Search, 
  FileText, 
  Users, 
  Settings, 
  PlusCircle, 
  LayoutDashboard,
  LogOut,
  Calculator,
  UserPlus,
  Receipt,
  Sparkles
} from 'lucide-react';
import { auth } from '../lib/firebase';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={setOpen} 
      label="Global Command Palette"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-[640px] bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center border-b px-4">
          <Search className="mr-3 h-5 w-5 text-muted-foreground" />
          <Command.Input 
            placeholder="Tapez un nom de menu ou une action..." 
            className="flex-1 h-16 bg-transparent outline-none text-base font-medium placeholder:text-muted-foreground"
          />
          <div className="hidden sm:flex items-center gap-1.5 ml-4 px-2 py-1 rounded bg-muted border text-[10px] font-black text-muted-foreground">
            ESC
          </div>
        </div>
        
        <Command.List className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-12 text-center">
            <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-3">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Aucun résultat trouvé.</p>
          </Command.Empty>

          <Command.Group heading="Navigation" className="px-2 py-3">
            <Command.Item
              onSelect={() => runCommand(() => navigate('/'))}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default select-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors group"
            >
              <LayoutDashboard size={20} className="text-muted-foreground group-hover:text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Tableau de bord</span>
                <span className="text-[10px] text-muted-foreground">Vue d'ensemble de l'activité</span>
              </div>
            </Command.Item>
            
            <Command.Item
              onSelect={() => runCommand(() => navigate('/entries'))}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default select-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors group"
            >
              <FileText size={20} className="text-muted-foreground group-hover:text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Saisie Comptable</span>
                <span className="text-[10px] text-muted-foreground">Journaliser des écritures</span>
              </div>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => navigate('/invoices'))}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default select-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors group"
            >
              <Receipt size={20} className="text-muted-foreground group-hover:text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Facturation</span>
                <span className="text-[10px] text-muted-foreground">Gérer les ventes et achats</span>
              </div>
            </Command.Item>
          </Command.Group>

          <Separator className="mx-2 my-2 opacity-50" />

          <Command.Group heading="Actions Rapides" className="px-2 py-3">
            <Command.Item
              onSelect={() => runCommand(() => navigate('/entries?action=new'))}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-default select-none hover:bg-primary/10 hover:text-primary aria-selected:bg-primary/10 aria-selected:text-primary transition-colors group"
            >
              <PlusCircle size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-tight">Nouvelle Écriture</span>
                <span className="text-[10px] opacity-70">Ajouter manuellement au journal</span>
              </div>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => navigate('/users'))}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-default select-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors group"
            >
              <UserPlus size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Inviter un Utilisateur</span>
                <span className="text-[10px] text-muted-foreground">Accorder l'accès à l'équipe</span>
              </div>
            </Command.Item>
          </Command.Group>

          <Separator className="mx-2 my-2 opacity-50" />

          <Command.Group heading="Compte" className="px-2 py-3">
            <Command.Item
              onSelect={() => runCommand(() => navigate('/settings'))}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default select-none hover:bg-accent hover:text-accent-foreground aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors group"
            >
              <Settings size={20} className="text-muted-foreground group-hover:text-primary" />
              <span className="text-sm font-bold">Paramètres de l'agence</span>
            </Command.Item>

            <Command.Item
              onSelect={() => runCommand(() => auth.signOut())}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-default select-none hover:bg-destructive/10 hover:text-destructive aria-selected:bg-destructive/10 aria-selected:text-destructive transition-colors group"
            >
              <LogOut size={20} className="text-destructive/70" />
              <span className="text-sm font-bold">Déconnexion</span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded border bg-card">↑↓</span>
              <span>Naviguer</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
              <span className="px-1.5 py-0.5 rounded border bg-card">ENTER</span>
              <span>Sélectionner</span>
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <Sparkles size={12} />
            Command Center
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}
