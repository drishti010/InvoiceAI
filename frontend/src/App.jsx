import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import UploadInvoice from "./pages/UploadInvoice";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

import "./App.css";

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("invoiceai-theme") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("invoiceai-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "dark" ? "light" : "dark"
    );
  };

  const isLoggedIn = () => Boolean(localStorage.getItem("token"));

  const protectedPage = (Component) =>
    isLoggedIn() ? (
      <Component theme={theme} toggleTheme={toggleTheme} />
    ) : (
      <Navigate to="/login" replace />
    );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={isLoggedIn() ? "/dashboard" : "/login"}
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        <Route
          path="/dashboard"
          element={protectedPage(Dashboard)}
        />

        <Route
          path="/invoices"
          element={protectedPage(Invoices)}
        />

        <Route
          path="/upload"
          element={protectedPage(UploadInvoice)}
        />

        <Route
          path="/analytics"
          element={protectedPage(Analytics)}
        />

        <Route
          path="/settings"
          element={protectedPage(Settings)}
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isLoggedIn() ? "/dashboard" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
