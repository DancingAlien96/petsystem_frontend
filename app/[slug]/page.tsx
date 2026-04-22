"use client";

import { useEffect, useState } from "react";
import AlertForm from "../../components/AlertForm";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

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

export default function DynamicBadgePage({ params }: { params: { slug: string } }) {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPageInfo = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/pages/${params.slug}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "No se encontró la ruta.");
          setLoading(false);
          return;
        }

        setPageInfo(data);
      } catch {
        setError("Error al cargar la información de la página.");
      } finally {
        setLoading(false);
      }
    };

    fetchPageInfo();
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl shadow-slate-200">
        {loading ? (
          <p>Cargando página de la medalla...</p>
        ) : error ? (
          <div className="rounded-3xl border border-red-300 bg-red-50 p-6 text-red-700">
            <p>{error}</p>
          </div>
        ) : (
          <AlertForm slug={params.slug} pageInfo={pageInfo ?? undefined} />
        )}
      </div>
    </div>
  );
}
