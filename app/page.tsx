"use client";

import { useEffect, useMemo, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

declare global {
  interface Window {
    grecaptcha?: any;
    onRecaptchaLoaded?: () => void;
  }
}

const templates = [
  {
    title: "Mensaje 1: Aviso rápido",
    text: "Hola, encontré a tu mascota cerca de la ubicación informada. Mi nombre es [NOMBRE] y mi teléfono es [TELÉFONO].",
  },
  {
    title: "Mensaje 2: Coordinar entrega",
    text: "Hola, soy [NOMBRE]. Creo haber visto a tu mascota y quiero coordinar la entrega. Mi número es [TELÉFONO].",
  },
  {
    title: "Mensaje 3: Ubicación exacta",
    text: "Tu mascota está en una ubicación cercana. Contáctame al [TELÉFONO] para que pueda ayudarte a recuperarla.",
  },
];

export default function Home() {
  const [petId, setPetId] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState("Completa tu nombre y teléfono para activar el envío automático.");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [petName, setPetName] = useState("");
  const [alertId, setAlertId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("No se ha obtenido ubicación todavía.");
  const [recaptchaRendered, setRecaptchaRendered] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [customTemplate, setCustomTemplate] = useState("Hola, soy [NOMBRE] y creo haber visto a [MASCOTA]. Mi teléfono es [TELÉFONO].");

  const defaultMessage = useMemo(() => {
    return customTemplate
      .replace("[NOMBRE]", reporterName || "tu nombre")
      .replace(/\[TELÉFONO\]/g, reporterPhone || "tu teléfono")
      .replace(/\[MASCOTA\]/g, petName || "tu mascota");
  }, [customTemplate, reporterName, reporterPhone, petName]);

  const isReadyToSend = reporterName.trim().length > 0 && reporterPhone.trim().length > 0 && petId.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("petId") || "";
    if (id) {
      setPetId(id);
    } else {
      setFeedback("No se encontró identificación de mascota; usa un enlace de reporte válido.");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!RECAPTCHA_SITE_KEY) {
      setFeedback("Falta configurar NEXT_PUBLIC_RECAPTCHA_SITE_KEY en el frontend.");
      return;
    }

    function renderRecaptcha() {
      if (!window.grecaptcha || recaptchaRendered) return;
      window.grecaptcha.render("recaptcha-container", {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token: string) => {
          setCaptchaToken(token);
          setCaptchaError("");
          setFeedback("reCAPTCHA completado. Presiona Enviar para terminar.");
        },
        "expired-callback": () => {
          setCaptchaToken("");
          setCaptchaError("El reCAPTCHA expiró, por favor complétalo nuevamente.");
        },
      });
      setRecaptchaRendered(true);
    }

    if (window.grecaptcha && !recaptchaRendered) {
      renderRecaptcha();
      return;
    }

    window.onRecaptchaLoaded = () => {
      renderRecaptcha();
    };

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [recaptchaRendered]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMessage(`Ubicación capturada: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        setLocationMessage(`No se pudo obtener ubicación: ${error.message}`);
      },
      { timeout: 10000 }
    );
  }, []);

  const submitAlert = async (token: string) => {
    setStatus("sending");
    setFeedback("Enviando correo al dueño...");

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
          recaptchaToken: token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setFeedback(data.error || "No se pudo enviar el correo.");
        return;
      }

      setStatus("sent");
      setFeedback("Correo enviado correctamente al dueño.");
      setOwnerEmail(data.ownerEmail || "");
      setPetName(data.petName || "");
      setAlertId(data.alertId || null);
    } catch (error) {
      setStatus("error");
      setFeedback("Error de conexión al backend. Revisa que el servidor esté activo.");
    }
  };

  const handleSend = async () => {
    if (!isReadyToSend) {
      setFeedback("Completa tu nombre, teléfono y el reCAPTCHA antes de enviar.");
      return;
    }

    if (!captchaToken) {
      setCaptchaError("Completa el reCAPTCHA para poder enviar.");
      return;
    }

    await submitAlert(captchaToken);
  };

  const templateButtons = templates.map((template) => {
    const text = template.text
      .replace("[NOMBRE]", reporterName || "tu nombre")
      .replace(/\[TELÉFONO\]/g, reporterPhone || "tu teléfono")
      .replace(/\[MASCOTA\]/g, petName || "tu mascota");

    return (
      <button
        key={template.title}
        type="button"
        onClick={() => setCustomTemplate(template.text)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-left text-sm font-semibold text-slate-900 transition hover:border-slate-500"
      >
        <div className="text-slate-800">{template.title}</div>
        <div className="mt-2 text-slate-600 text-xs">{text}</div>
      </button>
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-slate-100 p-6">
          <h1 className="text-3xl font-semibold">Formulario de alerta de extravío</h1>
          <p className="mt-3 text-slate-700">
            Completa tu nombre y número para que el primer correo se envíe al dueño. Luego activa el reCAPTCHA y presiona Enviar.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Atención</p>
                <p>Este formulario no solicita el ID de la mascota. El sistema usa la identificación oculta del enlace de reporte.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Nombre del reportero</label>
                  <input
                    value={reporterName}
                    onChange={(event) => setReporterName(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Teléfono del reportero</label>
                  <input
                    value={reporterPhone}
                    onChange={(event) => setReporterPhone(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-700"
                    placeholder="Ej: +34 600 123 456"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  disabled={!isReadyToSend}
                  onClick={handleSend}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Enviar
                </button>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Estado de la alerta</p>
                <p>{feedback}</p>
                {captchaError && <p className="text-red-600">{captchaError}</p>}
                <p>{locationMessage}</p>
                {alertId && (
                  <p>
                    ID de alerta: <span className="font-mono text-slate-900">{alertId}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Mensajes predeterminados</h2>
              <p className="mt-2 text-sm text-slate-600">Selecciona un mensaje para usarlo como base. El sistema enviará el correo al dueño.</p>
            </div>

            <div className="space-y-3">{templateButtons}</div>

            <div className="mt-6 rounded-3xl bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold">Mensaje seleccionado</p>
              <p className="mt-2 whitespace-pre-line break-words text-slate-600">{defaultMessage}</p>
            </div>

            <div className="mt-6 rounded-3xl bg-white p-4 text-sm text-slate-700">
              <div id="recaptcha-container" className="mx-auto" />
              <p className="mt-3 text-slate-600">
                Si no ves el reCAPTCHA, revisa que la variable de entorno NEXT_PUBLIC_RECAPTCHA_SITE_KEY esté configurada.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
