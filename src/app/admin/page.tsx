import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminApp } from "@/components/admin/AdminApp";
import { isAdminAllowedHere } from "@/lib/host";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  robots: { index: false, follow: false },
};

// PUBLIC_URL ve ADMIN_HOST çalışma anında okunur
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Yönetim ayrı alan adındaysa müşteri sitesinde /admin hiç yokmuş gibi 404 verir
  if (!(await isAdminAllowedHere())) notFound();
  return <AdminApp siteUrl={process.env.PUBLIC_URL?.trim() || "/"} />;
}
