import type { Metadata } from "next";
import { ItineraryMaker } from "@/components/itinerary-maker";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function EditPage() { return <ItineraryMaker />; }
