import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LibraryBig, LogOut, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { APP_NAME } from "../config";

const navClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-paper-dark hover:text-ink"
  }`;

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-paper-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/home" className="flex items-center gap-2.5 rounded-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white">
              <LibraryBig className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-serif text-lg font-bold text-brand-900">{APP_NAME}</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <NavLink to="/home" className={navClass}>
              Library
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/add" className="btn-primary hidden sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              Add book
            </Link>
            <span className="hidden text-sm text-ink-muted md:inline">{user?.username}</span>
            <button onClick={handleLogout} className="icon-btn" title="Log out" aria-label="Log out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
        <Outlet />
      </main>

      <footer className="border-t border-paper-line py-6 text-center text-xs text-ink-muted">
        {APP_NAME} · our family catalogue
      </footer>
    </div>
  );
}

export default AppLayout;
