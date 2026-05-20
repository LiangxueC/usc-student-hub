import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Classes from "./pages/Classes";
import Assignments from "./pages/Assignments";
import Matrix from "./pages/Matrix";
import CalendarPage from "./pages/Calendar";
import FocusTimer from "./pages/FocusTimer";
import Grades from "./pages/Grades";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <Navbar userEmail={session.user.email} />
      <Routes>
        <Route path="/" element={<Classes />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/matrix" element={<Matrix />} />
        <Route path="/todos" element={<Matrix />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/focus" element={<FocusTimer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
