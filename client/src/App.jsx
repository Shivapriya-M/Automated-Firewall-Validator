import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Rules from './pages/Rules.jsx';
import RuleForm from './pages/RuleForm.jsx';
import RuleDetails from './pages/RuleDetails.jsx';
import RuleValidation from './pages/RuleValidation.jsx';
import DFASimulator from './pages/DFASimulator.jsx';
import DFATable from './pages/DFATable.jsx';
import DFAStateDiagram from './pages/DFAStateDiagram.jsx';
import ValidationHistory from './pages/ValidationHistory.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import About from './pages/About.jsx';
import UserManagement from './pages/UserManagement.jsx';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="rules" element={<Rules />} />
        <Route path="rules/new" element={<RuleForm />} />
        <Route path="rules/:id" element={<RuleDetails />} />
        <Route path="rules/:id/edit" element={<RuleForm />} />
        <Route path="validation" element={<RuleValidation />} />
        <Route path="dfa/simulator" element={<DFASimulator />} />
        <Route path="dfa/table" element={<DFATable />} />
        <Route path="dfa/diagram" element={<DFAStateDiagram />} />
        <Route path="history" element={<ValidationHistory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="about" element={<About />} />
        <Route path="user-management" element={user?.role === 'superadmin' ? <UserManagement /> : <Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
