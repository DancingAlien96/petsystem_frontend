"use client";

import { useEffect, useMemo, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

type PageInfo = {
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  petName: string;
  petType?: string;
  petBreed?: string;
  label?: string;
};

type AlertFormProps = {
  slug?: string;
  pageInfo?: PageInfo;
};

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

export default function AlertForm({ slug, pageInfo }: AlertFormProps) {
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [feedback, setFeedback] = useState(
    pageInfo
      ? `Formulario para ${pageInfo.petName} de ${pageInfo.ownerName}. El primer correo se enviará automáticamente cuando abra la página.`
      : "Abre el enlace y se enviará una alerta automática al dueño."
  );
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("No se ha obtenido ubicación todavía.");
  const [autoAlertSent, setAutoAlertSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [customTemplate, setCustomTemplate] = useState(
    "Hola, soy [NOMBRE] y creo haber visto a [MASCOTA]. Mi teléfono es [TELÉFONO]."
  );

  const pageSlug = slug ?? pageInfo?.slug;

  const defaultMessage = useMemo(() => {
    return customTemplate
      .replace("[NOMBRE]", reporterName || "tu nombre")
      .replace(/\[TELÉFONO\]/g, reporterPhone || "tu teléfono")
      .replace(/\[MASCOTA\]/g, pageInfo?.petName || "tu mascota");
  }, [customTemplate, reporterName, reporterPhone, pageInfo]);

  const isReadyToSend = reporterName.trim().length > 0 && reporterPhone.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!RECAPTCHA_SITE_KEY) {
      setFeedback("Falta configurar NEXT_PUBLIC_RECAPTCHA_SITE_KEY en el frontend.");
      return;
    }

    window.onCaptchaSuccess = (token: string) => {
      setCaptchaToken(token);
      setCaptchaError("");
      setFeedback("reCAPTCHA completado. Presiona Enviar para terminar.");
    };

    window.onCaptchaExpired = () => {
      setCaptchaToken("");
      setCaptchaError("El reCAPTCHA expiró, por favor complétalo nuevamente.");
    };

    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
      delete window.onCaptchaSuccess;
      delete window.onCaptchaExpired;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationMessage("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationMessage(
          `Ubicación capturada: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`
        );
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (error) => {
        setLocationMessage(`No se pudo obtener ubicación: ${error.message}`);
      },
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (autoAlertSent) return;

    const timer = window.setTimeout(() => {
      setStatus("sending");
      setFeedback("Enviando la alerta automática al dueño...");

      fetch(`${BACKEND_URL}/api/alerts/auto${pageSlug ? `/${pageSlug}` : ""}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporterName: reporterName || "Anónimo",
          reporterPhone: reporterPhone || "No proporcionado",
          location,
        }),
      })
        .then((response) => response.json().then((data) => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
          if (status !== 200) {
            setStatus("error");
            setFeedback(body.error || "No se pudo enviar la alerta automática.");
            return;
          }

          setStatus("sent");
          setFeedback("La alerta automática se envió al dueño.");
          setAutoAlertSent(true);
        })
        .catch(() => {
          setStatus("error");
          setFeedback("Error de conexión al backend al enviar la alerta automática.");
        });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [autoAlertSent, location, reporterName, reporterPhone, pageSlug]);

  const submitAlert = async (token: string) => {
    setStatus("sending");
    setFeedback("Enviando correo al dueño...");

    try {
      const response = await fetch(`${BACKEND_URL}/api/alerts${pageSlug ? `/${pageSlug}` : ""}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporterName,
          reporterPhone,
          location,
          message: defaultMessage,
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
    } catch (error) {
      setStatus("error");
      setFeedback("Error de conexión al backend. Revisa que el servidor esté activo.");
    }
  };

  const handleSend = async () => {
    if (!isReadyToSend) {
      setFeedback("Completa tu nombre y teléfono antes de enviar.");
      return;
    }

    let token = captchaToken;
    if (!token && typeof window !== "undefined" && window.grecaptcha) {
      token = window.grecaptcha.getResponse();
      if (token) {
        setCaptchaToken(token);
      }
    }

    if (!token) {
      setCaptchaError("Completa el reCAPTCHA para poder enviar.");
      return;
    }

    await submitAlert(token);
  };

  const templateButtons = templates.map((template) => {
    const text = template.text
      .replace("[NOMBRE]", reporterName || "tu nombre")
      .replace(/\[TELÉFONO\]/g, reporterPhone || "tu teléfono")
      .replace(/\[MASCOTA\]/g, pageInfo?.petName || "tu mascota");

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
            {pageInfo
              ? `Esta página está asociada a ${pageInfo.petName} y su dueño ${pageInfo.ownerName}.`
              : "Completa tu nombre y número para que el primer correo se envíe al dueño. Luego activa el reCAPTCHA y presiona Enviar."}
          </p>
        </div>

        {pageInfo ? (
          <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            <p className="font-semibold text-slate-800">Destino de la alerta</p>
            <p>Medalla: {pageInfo.label || pageInfo.petName}</p>
            <p>Dueño: {pageInfo.ownerName}</p>
            <p>Email del dueño: {pageInfo.ownerEmail}</p>
            {pageInfo.ownerPhone ? <p>Teléfono del dueño: {pageInfo.ownerPhone}</p> : null}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Atención</p>
                <p>Este formulario enviará una alerta automática al abrir la página y después podrás enviar un segundo mensaje.</p>
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

              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Plantilla de mensaje</p>
                <textarea
                  value={customTemplate}
                  onChange={(event) => setCustomTemplate(event.target.value)}
                  className="mt-2 min-h-[120px] w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-700"
                />
              </div>

              <div className="grid gap-3">{templateButtons}</div>

              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Ubicación</p>
                <p>{locationMessage}</p>
              </div>

              <div className="space-y-3">
                <div className="g-recaptcha" data-sitekey={RECAPTCHA_SITE_KEY}></div>
                {captchaError ? <p className="text-sm text-red-600">{captchaError}</p> : null}
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!isReadyToSend}
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Enviar mensaje al dueño
                </button>
              </div>

              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Estado</p>
                <p>{status === "sending" ? "Procesando..." : feedback}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
              <p className="mt-3 text-slate-700">
                Completa los datos y envía el mensaje para que el dueño reciba un segundo correo con tu texto.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
