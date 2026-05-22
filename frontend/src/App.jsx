import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import Assignments from "./pages/Assignments";
import Matrix from "./pages/Matrix";
import CalendarPage from "./pages/Calendar";
import FocusTimer from "./pages/FocusTimer";
import SyllabusSearch from "./pages/SyllabusSearch";
import Grades from "./pages/Grades";
import DegreeProgress from "./pages/DegreeProgress";
import USCNews from "./pages/USCNews";
import Groups from "./pages/Groups";

export default function App() {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (!session) return <Login />;

  return (
    <BrowserRouter>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar userEmail={session.user.email} />
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minWidth: 0 }}>
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/classes"         element={<Classes />} />
            <Route path="/assignments"     element={<Assignments />} />
            <Route path="/matrix"          element={<Matrix />} />
            <Route path="/todos"           element={<Matrix />} />
            <Route path="/calendar"        element={<CalendarPage />} />
            <Route path="/grades"          element={<Grades />} />
            <Route path="/focus"           element={<FocusTimer />} />
            <Route path="/syllabus-search" element={<SyllabusSearch />} />
            <Route path="/degree"          element={<DegreeProgress />} />
            <Route path="/news"            element={<USCNews />} />
            <Route path="/groups"          element={<Groups />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
