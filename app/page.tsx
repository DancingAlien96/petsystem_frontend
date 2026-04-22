"use client";

import { useEffect, useMemo, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

function encode(value: string) {
  return encodeURIComponent(value);
}

function buildMailto(ownerEmail: string, petName: string, reporterName: string, reporterPhone: string) {
  const body = `Hola, soy ${reporterName || "un reportero"} y creo haber visto a ${petName}. Mi teléfono es ${reporterPhone || "no disponible"}. Por favor contáctame para coordinar.`;
  return `mailto:${ownerEmail}?subject=${encode(`Aviso de ${petName} encontrado`)}&body=${encode(body)}`;
}

export default function Home() {
  const [petId, setPetId] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("Esperando para enviar la alerta automática...");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [petName, setPetName] = useState("");
  const [alertId, setAlertId] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState("No se ha obtenido ubicación todavía.");
  const [autoSent, setAutoSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultMessage = useMemo(() => {
    return `Hola, soy ${reporterName || "un reportero"} y creo que he visto a ${petName || "tu mascota"}. Mi teléfono es ${reporterPhone || "no disponible"}.`;
  }, [reporterName, reporterPhone, petName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("petId") || "";
    if (id) {
      setPetId(id);
    }
  }, []);

  useEffect(() => {
    if (!petId || autoSent) return;

    const sendAlert = async (location?: { lat: number; lng: number }) => {
      setStatus("sending");
      setFeedback("Enviando alerta automática al dueño...");

      try {
        const response = await fetch(`${BACKEND_URL}/api/alerts/auto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            petId,
            reporterName,
            reporterPhone,
            location,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setFeedback(data.error || "No se pudo enviar la alerta automática.");
          return;
        }

        setStatus("sent");
        setFeedback("El primer correo se envió automáticamente al dueño.");
        setOwnerEmail(data.ownerEmail || "");
        setPetName(data.petName || "");
        setAlertId(data.alertId || null);
        setAutoSent(true);
      } catch (error) {
        setStatus("error");
        setFeedback("Error de conexión al backend. Revisa que el servidor esté activo.");
      }
    };

    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no soporta geolocalización.");
      sendAlert();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMessage(`Ubicación capturada: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        sendAlert({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setLocationMessage(`No se pudo obtener ubicación: ${error.message}`);
        sendAlert();
      },
      { timeout: 10000 }
    );
  }, [petId, autoSent, reporterName, reporterPhone]);

  const handleManualSend = async () => {
    if (!petId) {
      setFeedback("Debes ingresar el ID de la mascota para enviar la alerta.");
      setStatus("error");
      return;
    }
    setAutoSent(false);
    setStatus("idle");
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(defaultMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const mailtoLink = ownerEmail
    ? buildMailto(ownerEmail, petName, reporterName, reporterPhone)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        <div className="mb-8 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-100 p-6">
          <h1 className="text-3xl font-semibold">Alerta automática de extravío</h1>
          <p className="text-slate-700">
            Al abrir esta página, el sistema intentará enviar un correo automático al dueño de la mascota usando el
            identificador `petId` y la ubicación GPS cuando esté disponible.
          </p>
          <p className="text-sm text-slate-500">Si no usas un enlace con `?petId=...`, ingresa el ID manualmente.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700">ID de la mascota</label>
            <input
              value={petId}
              onChange={(event) => setPetId(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
              placeholder="Ejemplo: 642dfb6be8f1a5e0a9c2b4d5"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Nombre del reportero</label>
                <input
                  value={reporterName}
                  onChange={(event) => setReporterName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Teléfono del reportero</label>
                <input
                  value={reporterPhone}
                  onChange={(event) => setReporterPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                  placeholder="+34 600 123 456"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSend}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Reintentar alerta automática
            </button>

            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Estado de la alerta</p>
              <p>{feedback}</p>
              <p>{locationMessage}</p>
              {alertId && <p>ID de alerta: <span className="font-mono text-slate-900">{alertId}</span></p>}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-slate-700">Botones de contacto predeterminados</p>
              <p className="text-sm text-slate-600">Usa estas opciones después de que el correo automático ya haya sido enviado.</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={!mailtoLink}
                onClick={() => {
                  if (!mailtoLink) return;
                  window.location.href = mailtoLink;
                }}
                className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Enviar correo predeterminado al dueño
              </button>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {copied ? "Texto copiado" : "Copiar mensaje para WhatsApp/SMS"}
              </button>
              <div className="rounded-3xl bg-white p-4 text-sm text-slate-700">
                <p className="font-semibold">Mensaje sugerido</p>
                <p>{defaultMessage}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-800">Correo del dueño</p>
              <p>{ownerEmail || "Se mostrará cuando el backend responda."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
