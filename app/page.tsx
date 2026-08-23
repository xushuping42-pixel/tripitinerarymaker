import { ItineraryMaker } from "@/components/itinerary-maker";

const webApplication = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Trip Itinerary Maker",
  url: "https://www.tripitinerarymaker.com",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: "Free editable trip itinerary template — create, customize & download your travel itinerary in minutes. No sign-up required.",
  browserRequirements: "Requires JavaScript",
};

export default function Home() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplication) }} />
    <ItineraryMaker />
  </>;
}
