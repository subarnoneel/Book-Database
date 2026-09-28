import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LibraryBig } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import BookDetails from "./pages/BookDetails";
import AddBook from "./pages/AddBook";
import UpdateBook from "./pages/UpdateBook";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LibraryBig className="h-8 w-8 animate-pulse text-brand-600" aria-label="Loading" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/books/:id" element={<BookDetails />} />
              <Route path="/add" element={<AddBook />} />
              <Route path="/update/:id" element={<UpdateBook />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
