import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur inattendue s'est produite.";
      
      try {
        // Check if it's our JSON error from Firestore
        if (this.state.error?.message.startsWith('{')) {
          const errData = JSON.parse(this.state.error.message);
          errorMessage = `Erreur de permission Firestore: ${errData.error}`;
        } else if (this.state.error) {
          errorMessage = this.state.error.message;
        }
      } catch (e) {
        // Fallback if parsing fails
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
          <Card className="w-full max-w-md border-destructive/50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                  <AlertCircle size={32} />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-destructive">Oups ! Quelque chose s'est mal passé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                className="w-full gap-2"
              >
                <RefreshCcw size={18} />
                Recharger l'application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
