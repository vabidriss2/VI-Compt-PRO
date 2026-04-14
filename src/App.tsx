import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Accounts from './pages/Accounts';
import Ledger from './pages/Ledger';
import Invoices from './pages/Invoices';
import Contacts from './pages/Contacts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Taxes from './pages/Taxes';
import Journals from './pages/Journals';
import AnalyticalPlans from './pages/AnalyticalPlans';
import Banks from './pages/Banks';
import AuditLogs from './pages/AuditLogs';
import Balance from './pages/Balance';
import Entries from './pages/Entries';
import JournalReports from './pages/JournalReports';
import UserManagement from './pages/UserManagement';
import Products from './pages/Products';
import EntryTemplates from './pages/EntryTemplates';
import Schedules from './pages/Schedules';
import Reminders from './pages/Reminders';
import ImportOCR from './pages/ImportOCR';
import Lettering from './pages/Lettering';
import BankRecon from './pages/BankRecon';
import Revisions from './pages/Revisions';
import Drafts from './pages/Drafts';
import VAT from './pages/VAT';
import TaxFiling from './pages/TaxFiling';
import FEC from './pages/FEC';
import CashFlow from './pages/CashFlow';
import Payments from './pages/Payments';
import Closings from './pages/Closings';
import Archive from './pages/Archive';
import Backup from './pages/Backup';
import PlaceholderPage from './components/PlaceholderPage';
import { Toaster } from '@/components/ui/sonner';
import { NetworkStatus } from './components/NetworkStatus';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/taxes" element={<Taxes />} />
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* New Routes */}
                    <Route path="/analytical-plans" element={<AnalyticalPlans />} />
                    <Route path="/journals" element={<Journals />} />
                    <Route path="/entry-templates" element={<EntryTemplates />} />
                    <Route path="/banks" element={<Banks />} />
                    <Route path="/schedules" element={<Schedules />} />
                    <Route path="/reminders" element={<Reminders />} />
                    <Route path="/entries" element={<Entries />} />
                    <Route path="/import" element={<ImportOCR />} />
                    <Route path="/lettering" element={<Lettering />} />
                    <Route path="/bank-recon" element={<BankRecon />} />
                    <Route path="/revisions" element={<Revisions />} />
                    <Route path="/drafts" element={<Drafts />} />
                    <Route path="/journal-reports" element={<JournalReports />} />
                    <Route path="/balance" element={<Balance />} />
                    <Route path="/management-reports" element={<Reports />} />
                    <Route path="/vat" element={<VAT />} />
                    <Route path="/tax-filing" element={<TaxFiling />} />
                    <Route path="/fec" element={<FEC />} />
                    <Route path="/cash-flow" element={<CashFlow />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/closings" element={<Closings />} />
                    <Route path="/archive" element={<Archive />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/backup" element={<Backup />} />
                    <Route path="/audit" element={<AuditLogs />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster />
      <NetworkStatus />
    </AuthProvider>
  );
}
