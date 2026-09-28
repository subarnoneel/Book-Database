import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">Page not found</h1>
      <Link to="/home" className="text-blue-600 underline">
        Back to the book list
      </Link>
    </div>
  );
}

export default NotFound;
