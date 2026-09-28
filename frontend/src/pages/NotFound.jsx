import { Link } from "react-router-dom";
import { BookX } from "lucide-react";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <BookX className="mx-auto h-12 w-12 text-brand-600" aria-hidden />
        <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-ink-soft">This page isn’t on any of our shelves.</p>
        <Link to="/home" className="btn-primary mt-6">
          Back to the library
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
