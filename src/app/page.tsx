import { BookingProvider } from "@/components/booking/BookingProvider";
import { redirect } from "next/navigation";
import { FloatingTools } from "@/components/FloatingTools";
import { Contact } from "@/components/site/Contact";
import { FloatingActions } from "@/components/site/FloatingActions";
import { Footer } from "@/components/site/Footer";
import { Gallery } from "@/components/site/Gallery";
import { Hero } from "@/components/site/Hero";
import { Loyalty } from "@/components/site/Loyalty";
import { Navbar } from "@/components/site/Navbar";
import { Reviews } from "@/components/site/Reviews";
import { Marquee, Services, Team } from "@/components/site/Services";
import { getBookingSettings } from "@/lib/db";
import { listClosures, listReviews, listServices, listStaff, listWorkingHours, reviewStats } from "@/lib/queries";
import { adminEntryUrl, isOnAdminHost } from "@/lib/host";
import { SITE } from "@/lib/site";
import { shopNow } from "@/lib/time";

// Fiyat/saat/doluluk admin panelinden değişebildiği için sayfa her istekte taze veriyle üretilir.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Yönetim ayrı alan adındaysa (ADMIN_HOST) o adrese gelen ziyaretçi doğrudan panele yönlenir
  if (await isOnAdminHost()) redirect("/admin");

  // Bağımsız sorgular paralel çalışır (bulut veri tabanında sayfa açılışını hızlandırır)
  const [services, staff, hours, settings, closures, reviewList, reviewSummary] = await Promise.all([
    listServices(true),
    listStaff(true),
    listWorkingHours(),
    getBookingSettings(),
    listClosures(shopNow().date),
    listReviews(true),
    reviewStats(),
  ]);
  const closedDates = closures.filter((c) => c.staffId === null && !c.startTime).map((c) => ({ date: c.date, reason: c.reason }));
  const reviews = { reviews: reviewList, stats: reviewSummary };

  // Arama motorları için yapılandırılmış veri (schema.org BarberShop)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: SITE.name,
    description: SITE.description,
    telephone: "+905433700137",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Hanlı Merkez, Erenler Cd. 20-c",
      addressLocality: "Erenler",
      addressRegion: "Sakarya",
      postalCode: "54100",
      addressCountry: "TR",
    },
    openingHoursSpecification: hours
      .filter((h) => h.isOpen)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][h.weekday],
        opens: h.openTime,
        closes: h.closeTime,
      })),
    ...(reviews.stats.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviews.stats.average, reviewCount: reviews.stats.count } }
      : {}),
  };

  return (
    <BookingProvider data={{ services, staff, hours, settings, closedDates }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <FloatingTools />
      <Navbar adminUrl={adminEntryUrl()} />
      <main className="relative z-10">
        <Hero hours={hours} rating={reviews.stats} />
        <Marquee items={services.map((s) => s.name)} />
        <Services services={services} />
        <Team staff={staff} />
        <Gallery />
        <Loyalty />
        <Reviews initial={reviews} />
        <Contact hours={hours} />
      </main>
      <Footer />
      <FloatingActions />
    </BookingProvider>
  );
}
