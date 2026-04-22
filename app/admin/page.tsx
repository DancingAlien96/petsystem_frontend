"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

type AdminPageItem = {
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  petName: string;
  petType?: string;
  petBreed?: string;
  label?: string;
};

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [petBreed, setPetBreed] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [createdPath, setCreatedPath] = useState("");
  const [pages, setPages] = useState<AdminPageItem[]>([]);

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-admin-user": adminUser,
    "x-admin-pass": adminPass,
  };

  const handleLogin = async () => {
    if (!adminUser || !adminPass) {
      setAuthError("Ingrese usuario y contraseña.");
      return;
    }

    setAuthError("");
    setStatus("sending");
    setStatusMessage("Validando credenciales...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminUser, adminPass }),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setAuthError(data.error || "Credenciales incorrectas.");
        return;
      }

      setIsLoggedIn(true);
      setStatus("sent");
      setStatusMessage("Autenticado correctamente.");
      loadPages();
    } catch (error) {
      setStatus("error");
      setAuthError("Error de conexión al backend.");
    }
  };

  const loadPages = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/pages`, {
        headers: adminHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        setPages([]);
        setAuthError(data.error || "No se pudo cargar las páginas de clientes.");
        setIsLoggedIn(false);
        return;
      }
      setPages(data);
    } catch (error) {
      setPages([]);
      setAuthError("Error de conexión al backend.");
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadPages();
    }
  }, [isLoggedIn]);

  const handleCreatePage = async () => {
    if (!ownerName || !ownerEmail || !petName) {
      setStatus("error");
      setStatusMessage("Completa el nombre del dueño, correo y el nombre de la mascota.");
      return;
    }

    setStatus("sending");
    setStatusMessage("Creando ruta única...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/pages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminUser,
          adminPass,
          ownerName,
          ownerEmail,
          ownerPhone,
          petName,
          petType,
          petBreed,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setStatusMessage(data.error || "No se pudo crear la ruta.");
        return;
      }

      setStatus("sent");
      setStatusMessage("Ruta creada con éxito.");
      setCreatedPath(`/${data.slug}`);
      loadPages();
    } catch (error) {
      setStatus("error");
      setStatusMessage("Error de conexión con el backend.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAdminPass("");
    setPages([]);
    setStatus("idle");
    setStatusMessage("Sesión cerrada.");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        <h1 className="text-3xl font-semibold">Panel administrativo</h1>
        <p className="mt-3 text-slate-700">
          Accede con tu usuario y contraseña para ver tus clientes y crear nuevas rutas de formulario.
        </p>

        {!isLoggedIn ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Ingreso de administrador</h2>
            <label className="mt-4 block text-sm font-semibold text-slate-700">Usuario</label>
            <input
              value={adminUser}
              onChange={(event) => setAdminUser(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
              placeholder="Usuario admin"
            />
            <label className="mt-4 block text-sm font-semibold text-slate-700">Contraseña</label>
            <input
              type="password"
              value={adminPass}
              onChange={(event) => setAdminPass(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
              placeholder="Contraseña admin"
            />
            {authError ? <p className="mt-4 text-sm text-red-600">{authError}</p> : null}
            <button
              type="button"
              onClick={handleLogin}
              className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Iniciar sesión
            </button>
          </section>
        ) : (
          <>
            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Clientes / rutas generadas</h2>
                <p className="mt-2 text-sm text-slate-600">Aquí ves las medallas y enlaces creados para tus clientes.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Cerrar sesión
              </button>
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Crear nueva ruta</h3>
                  <p className="mt-2 text-sm text-slate-600">Genera automáticamente un enlace único para cada medalla.</p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Nombre del dueño</label>
                      <input
                        value={ownerName}
                        onChange={(event) => setOwnerName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Email del dueño</label>
                      <input
                        value={ownerEmail}
                        onChange={(event) => setOwnerEmail(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="dueño@correo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Teléfono del dueño</label>
                      <input
                        value={ownerPhone}
                        onChange={(event) => setOwnerPhone(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Nombre de la mascota</label>
                      <input
                        value={petName}
                        onChange={(event) => setPetName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="Nombre de la mascota"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Tipo de mascota</label>
                      <input
                        value={petType}
                        onChange={(event) => setPetType(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="Perro, gato, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Raza</label>
                      <input
                        value={petBreed}
                        onChange={(event) => setPetBreed(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreatePage}
                    className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Crear ruta única
                  </button>

                  {statusMessage ? (
                    <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-slate-700"}`}>
                      {statusMessage}
                    </p>
                  ) : null}

                  {createdPath ? (
                    <p className="mt-3 text-sm text-slate-700">
                      Enlace: <a className="font-mono text-slate-900" href={window.location.origin + createdPath}>{window.location.origin + createdPath}</a>
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Clientes activos</h3>
                  <div className="mt-4 space-y-3">
                    {pages.length === 0 ? (
                      <p className="text-sm text-slate-600">No hay rutas creadas aún.</p>
                    ) : (
                      pages.map((page) => (
                        <article key={page.slug} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                          <p className="text-sm font-semibold text-slate-900">{page.label || page.petName}</p>
                          <p className="text-sm text-slate-600">Ruta: <a className="text-slate-900 underline" href={`/${page.slug}`}>{`/${page.slug}`}</a></p>
                          <p className="text-sm text-slate-600">Dueño: {page.ownerName}</p>
                          <p className="text-sm text-slate-600">Email: {page.ownerEmail}</p>
                          <p className="text-sm text-slate-600">Mascota: {page.petName}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
