import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import PublicLibrary from "./pages/PublicLibrary";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherLibrary from "./pages/TeacherLibrary";
import PrincipalDashboard from "./pages/PrincipalDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EnrolPage from "./pages/EnrolPage";
import SightingReport from "./pages/SightingReport";
import SightingsList from "./pages/SightingsList";
import Messages from "./pages/Messages";
import SchoolLibrary from "./pages/SchoolLibrary";
import StudentProfile from "./pages/StudentProfile";
import CommunityDashboard from "./pages/CommunityDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import MemberProfile from "./pages/MemberProfile";
import ProfileSettings from "./pages/ProfileSettings";
import CommunityLibrary from "./pages/CommunityLibrary";
import NotFound from "./pages/NotFound";
import "./App.css";

function DashboardLayout({ title, children }) {
  useEffect(() => {
    document.title = `${title} - Komodo Hub`;
  }, [title]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Navbar title={title} />
        <div className="app-content">{children}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/library" element={<PublicLibrary />} />
        <Route path="/public-library" element={<PublicLibrary />} />

        {/* ── Student Routes ── */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Student Dashboard">
                <StudentDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/enrol"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Enrol in Programs">
                <EnrolPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/sightings"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Sighting Reports">
                <SightingReport />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/messages"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="My Profile">
                <StudentProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/library"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="School Library">
                <SchoolLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/public-library"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Teacher Routes ── */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Teacher Dashboard">
                <TeacherDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/sightings"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Sighting Reports">
                <SightingsList />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/library"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="School Library">
                <TeacherLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/messages"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/public-library"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ── Principal Routes ── */}
        <Route
          path="/principal"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="Principal Dashboard">
                <PrincipalDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/library"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="School Library">
                <SchoolLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/messages"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/public-library"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/principal/profile"
          element={
            <ProtectedRoute allowedRoles={["principal"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ══ COMMUNITY ROUTES ══ */}

        {/* Chairman Dashboard */}
        <Route
          path="/community"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Community Dashboard">
                <CommunityDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/library"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Community Library">
                <CommunityLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/messages"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/profile"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="My Profile">
                <MemberProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/community/public-library"
          element={
            <ProtectedRoute allowedRoles={["chairman"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Member Dashboard */}
        <Route
          path="/member"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Member Dashboard">
                <MemberDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/sightings"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="My Contributions">
                <SightingReport />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/library"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Community Library">
                <CommunityLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/messages"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Messages">
                <Messages />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/profile"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="My Profile">
                <MemberProfile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/member/public-library"
          element={
            <ProtectedRoute allowedRoles={["member"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Public Member Profile — no auth required */}
        <Route
          path="/member/profile/:id"
          element={<MemberProfile />}
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Admin Dashboard">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/public-library"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="Public Library">
                <PublicLibrary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout title="My Profile">
                <ProfileSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
