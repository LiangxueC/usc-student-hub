import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Classes from "./pages/Classes";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <Navbar userEmail={session.user.email} />
      <Routes>
        <Route path="/" element={<Classes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
