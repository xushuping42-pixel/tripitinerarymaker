"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ItineraryPreview, type ItineraryData, type Template } from "@/components/itinerary-preview";
import type { DemoItineraryDay } from "@/src/data/demoItinerary";
import styles from "@/app/travel-planner-templates/page.module.css";

type TemplateDemoProps = {
  template: Template;
  description: string;
  bestFor: string;
  demoData: DemoItineraryDay[];
};

export function TemplateDemo({ template, description, bestFor, demoData }: TemplateDemoProps) {
  const [showDemo, setShowDemo] = useState(false);
  const itineraryData = useMemo<ItineraryData>(() => ({
    destination: "Paris, France",
    startDate: "2026-04-14",
    returnDate: "2026-04-16",
    days: demoData.map((day, dayIndex) => ({
      id: `demo-day-${dayIndex + 1}`,
      label: day.day,
      sourceIndex: dayIndex,
      items: day.items.map((item, itemIndex) => {
        const [startTime = "", endTime = ""] = item.time.split("–").map((part) => part.trim());
        return { id: `demo-day-${dayIndex + 1}-item-${itemIndex + 1}`, startTime, endTime, activity: item.activity, notes: "" };
      }),
    })),
  }), [demoData]);

  return <article className={styles.templateCard} id={template.id}>
    <Link href={`/?template=${template.id}`} className={`${styles.imageLink} ${styles.demoImageLink}`} aria-label={`Use the ${template.name} travel planner template`}>
      {showDemo ? <><ItineraryPreview data={itineraryData} pageDays={itineraryData.days} selectedTemplate={template} mode="screen" /><span className={styles.demoBadge}>Filled example</span></> : template.thumbnail ? <Image src={template.thumbnail} alt={`${template.name} — free printable travel planner template`} width={300} height={424} sizes="(max-width: 767px) calc((100vw - 52px) / 2), (max-width: 1023px) calc((100vw - 104px) / 3), 210px" loading="lazy" /> : <span className={styles.plainPaper} aria-hidden="true"><span>TRIP ITINERARY</span><i /><i /><i /><i /></span>}
    </Link>
    <div className={styles.cardCopy}>
      <div className={styles.templateName}>{template.name}</div><p>{description}</p><span>{bestFor}</span>
      <button type="button" className={styles.seeDemoButton} onClick={() => setShowDemo((visible) => !visible)} aria-pressed={showDemo}>{showDemo ? "Back to blank preview" : "See filled example"}</button>
      <Link href={`/?template=${template.id}`} className={styles.useTemplateButton}>Use this template</Link>
    </div>
  </article>;
}
