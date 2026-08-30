"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock3, Download, Expand, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import templateRecords from "@/data/templates.json";
import { ItineraryPreview, type ItineraryData, type ItineraryDay, type ItineraryItem, type Template, readableDate } from "@/components/itinerary-preview";

type TemplateStyle = "architectural" | "cute-playful" | "floral" | "animal" | "minimalist" | "sunny" | "vintage";
type TemplateRecord = typeof templateRecords[number];

const categoryDefinitions: ReadonlyArray<{ id: TemplateStyle | "original-text"; label: string }> = [
  { id: "architectural", label: "Architectural" },
  { id: "cute-playful", label: "Cute & Playful" },
  { id: "floral", label: "Floral" },
  { id: "animal", label: "Animal" },
  { id: "minimalist", label: "Minimalist" },
  { id: "sunny", label: "Sunny" },
  { id: "vintage", label: "Vintage" },
  { id: "original-text", label: "Original Text" },
];

type TemplateCategory = TemplateStyle | "original-text";
const templateStyles: readonly TemplateStyle[] = ["architectural", "cute-playful", "floral", "animal", "minimalist", "sunny", "vintage"];

function createTemplate(template: TemplateRecord): Template {
  if (!template.image) return { id: template.id, name: template.name };
  return {
    id: template.id,
    name: template.name,
    thumbnail: template.image.replace("/previews/", "/thumbnails/").replace("-preview.webp", "-thumb.webp"),
    image: template.image,
  };
}

const originalTextRecord = templateRecords.find((template) => template.category === "original-text");
const originalTextTemplate: Template = originalTextRecord ? createTemplate(originalTextRecord) : { id: "plain-paper", name: "Plain Paper" };
const availableTemplates: Template[] = templateRecords.map(createTemplate);
const defaultTemplateId = templateRecords.find((template) => template.category === "architectural")?.id ?? originalTextTemplate.id;

type Draft = { id: string; data: ItineraryData; selectedTemplateId: string; updatedAt: string };
const freshItem = (): ItineraryItem => ({ id: crypto.randomUUID(), startTime: "", endTime: "", activity: "", notes: "" });
const freshDay = (): ItineraryDay => ({ id: crypto.randomUUID(), items: [freshItem()] });
const freshData = (): ItineraryData => ({ destination: "", startDate: "", returnDate: "", days: [freshDay()] });

function dateAfterOrEqual(start: string, end: string) { return !start || !end || end >= start; }
function formatDateForDay(start: string, index: number) {
  if (!start) return "Date appears here after you select a start date";
  const date = new Date(`${start}T12:00:00`); date.setDate(date.getDate() + index);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}
function durationDays(start: string, end: string) {
  if (!start || !end || end < start) return null;
  return Math.floor((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1;
}
function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
function calendarValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type PageLayout = {
  capacity: number;
  gap: number;
  sections: Record<string, { heading: number; items: number[] }>;
};

function itemHeightUnits(item: ItineraryItem) {
  const contentLength = `${item.startTime} ${item.endTime} ${item.activity}`.trim().length;
  return Math.min(5, 1.1 + Math.floor(contentLength / 60) * 0.8);
}

function createPdfPages(days: ItineraryDay[], layout?: PageLayout) {
  const pageCapacity = layout?.capacity ?? 15.5;
  const dayHeadingUnits = 0.85;
  const pages: ItineraryDay[][] = [];
  let page: ItineraryDay[] = [];
  let used = 0;
  const closePage = () => { if (page.length) { pages.push(page); page = []; used = 0; } };

  days.forEach((day, sourceIndex) => {
    let section: ItineraryDay | null = null;
    const items = day.items.length ? day.items : [freshItem()];
    const measuredSection = layout?.sections[day.id];
    items.forEach((item, itemIndex) => {
      const itemUnits = measuredSection?.items[itemIndex] ?? itemHeightUnits(item);
      const isNewSection = !section;
      const headingUnits = measuredSection?.heading ?? dayHeadingUnits;
      const sectionGap = isNewSection && page.length ? (layout?.gap ?? 0) : 0;
      const requiredUnits = (isNewSection ? headingUnits + sectionGap : 0) + itemUnits;
      if (used + requiredUnits > pageCapacity && page.length) {
        closePage();
        section = null;
      }
      if (!section) {
        section = { ...day, sourceIndex, items: [] };
        page.push(section);
        used += (measuredSection?.heading ?? dayHeadingUnits) + (page.length > 1 ? (layout?.gap ?? 0) : 0);
      }
      section?.items.push(item);
      used += itemUnits;
    });
  });
  closePage();
  return pages.length ? pages : [[{ ...freshDay(), sourceIndex: 0 }]];
}

export function ItineraryMaker() {
  const [data, setData] = useState<ItineraryData>(() => freshData());
  const [previewData, setPreviewData] = useState<ItineraryData>(() => freshData());
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplateId);
  const [category, setCategory] = useState<TemplateCategory>("architectural");
  const [dateError, setDateError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editLink, setEditLink] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const paginationMeasureRef = useRef<HTMLDivElement>(null);
  const [pageLayout, setPageLayout] = useState<PageLayout>();
  const selectedTemplate = availableTemplates.find((item) => item.id === selectedTemplateId) ?? availableTemplates[0];
  const previewPages = useMemo(() => createPdfPages(previewData.days, pageLayout), [previewData.days, pageLayout]);
  const pdfPages = useMemo(() => createPdfPages(data.days, pageLayout), [data.days, pageLayout]);

  useLayoutEffect(() => {
    const measure = () => {
      const root = paginationMeasureRef.current;
      const daysElement = root?.querySelector<HTMLElement>(".paper-days");
      if (!root || !daysElement?.clientHeight) return;
      const gapValue = getComputedStyle(daysElement).rowGap;
      const gap = gapValue.endsWith("%") ? daysElement.clientHeight * Number.parseFloat(gapValue) / 100 : Number.parseFloat(gapValue) || 0;
      const sections: PageLayout["sections"] = {};
      root.querySelectorAll<HTMLElement>("[data-itinerary-day]").forEach((section) => {
        const dayId = section.dataset.itineraryDay;
        const content = Array.from(section.querySelectorAll<HTMLElement>(".paper-item, .paper-empty"));
        if (!dayId || !content.length) return;
        sections[dayId] = {
          heading: content[0].getBoundingClientRect().top - section.getBoundingClientRect().top,
          items: content.map((item) => item.getBoundingClientRect().height),
        };
      });
      setPageLayout({ capacity: daysElement.clientHeight, gap, sections });
    };
    const frame = requestAnimationFrame(measure);
    void document.fonts.ready.then(measure);
    return () => cancelAnimationFrame(frame);
  }, [previewData, selectedTemplate.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewData(data), 300);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/edit\/([^/]+)/);
    const params = new URLSearchParams(window.location.search);
    const requestedId = pathMatch?.[1] ?? params.get("edit");
    // The homepage always starts with a clean one-day form. Saved drafts are
    // restored only when the visitor opens their dedicated edit link.
    if (!requestedId) return;
    const stored = window.localStorage.getItem("trip-itinerary-draft");
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as Draft;
      if (draft.id === requestedId) {
        const restored = draft.data?.days?.length ? draft.data : freshData();
        const restoredTemplateId = availableTemplates.some((template) => template.id === draft.selectedTemplateId) ? draft.selectedTemplateId : defaultTemplateId;
        setData(restored); setPreviewData(restored); setSelectedTemplateId(restoredTemplateId);
        setEditLink(`${window.location.origin}/edit/${draft.id}`);
      }
    } catch { window.localStorage.removeItem("trip-itinerary-draft"); }
  }, []);

  useEffect(() => {
    const requestedTemplateId = new URLSearchParams(window.location.search).get("template");
    const requestedTemplate = templateRecords.find((template) => template.id === requestedTemplateId);
    if (!requestedTemplate) return;
    setSelectedTemplateId(requestedTemplate.id);
    setCategory(requestedTemplate.id === "plain-paper" ? "original-text" : requestedTemplate.category as TemplateStyle);
    const scrollFrame = window.requestAnimationFrame(() => document.getElementById("trip-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(scrollFrame);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const original = document.body.style.overflow;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setModalOpen(false); };
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = original; window.removeEventListener("keydown", close); };
  }, [modalOpen]);

  const updateData = (updater: (previous: ItineraryData) => ItineraryData, instantPreview = false) => {
    setData((previous) => { const next = updater(previous); if (instantPreview) setPreviewData(next); return next; });
  };
  const setField = (field: "destination" | "startDate" | "returnDate", value: string) => {
    if (field === "returnDate" && !dateAfterOrEqual(data.startDate, value)) { setDateError("Return date must be on or after the start date."); }
    else if (field === "startDate" && data.returnDate && !dateAfterOrEqual(value, data.returnDate)) { setDateError("Start date must be on or before the return date."); }
    else setDateError("");
    updateData((previous) => ({ ...previous, [field]: value }));
  };
  const updateItem = (dayIndex: number, itemIndex: number, field: keyof Omit<ItineraryItem, "id">, value: string) => {
    updateData((previous) => ({ ...previous, days: previous.days.map((day, index) => index !== dayIndex ? day : { ...day, items: day.items.map((item, itemIndexCurrent) => itemIndexCurrent !== itemIndex ? item : { ...item, [field]: value }) }) }), field === "startTime" || field === "endTime");
  };
  const addItem = (dayIndex: number) => updateData((previous) => ({ ...previous, days: previous.days.map((day, index) => index === dayIndex ? { ...day, items: [...day.items, freshItem()] } : day) }));
  const deleteItem = (dayIndex: number, itemIndex: number) => updateData((previous) => ({ ...previous, days: previous.days.map((day, index) => index !== dayIndex ? day : { ...day, items: day.items.length === 1 ? [freshItem()] : day.items.filter((_, current) => current !== itemIndex) }) }));
  const deleteDay = (dayIndex: number) => updateData((previous) => ({ ...previous, days: previous.days.length === 1 ? [freshDay()] : previous.days.filter((_, index) => index !== dayIndex) }));
  const addDay = () => {
    const max = durationDays(data.startDate, data.returnDate);
    if (max !== null && data.days.length >= max) { setDateError("All days in your selected travel dates are already included."); return; }
    setDateError(""); updateData((previous) => ({ ...previous, days: [...previous.days, freshDay()] }));
  };
  const scrollToEditor = () => document.getElementById("trip-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const saveDraft = () => {
    const old = window.localStorage.getItem("trip-itinerary-draft");
    let id = "";
    try { id = JSON.parse(old || "{}").id || ""; } catch { /* intentionally regenerate */ }
    id ||= `edit-${crypto.randomUUID().slice(0, 6)}`;
    const draft: Draft = { id, data, selectedTemplateId, updatedAt: new Date().toISOString() };
    window.localStorage.setItem("trip-itinerary-draft", JSON.stringify(draft));
    const link = `${window.location.origin}/edit/${id}`; setEditLink(link); return link;
  };
  const downloadPdf = async () => {
    setDownloading(true); setPdfError(""); setPdfStatus("Preparing your PDF…"); saveDraft();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      if (!exportRef.current) throw new Error("Preview unavailable");
      const papers = Array.from(exportRef.current.querySelectorAll<HTMLElement>(".itinerary-paper"));
      if (!papers.length) throw new Error("Preview unavailable");
      await document.fonts.ready;
      await Promise.all(papers.flatMap((paper) => Array.from(paper.querySelectorAll("img"))).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); })));
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      for (const [pageIndex, paper] of papers.entries()) {
        const canvas = await html2canvas(paper, { scale: 2, useCORS: true, backgroundColor: "#fffdf8", logging: false });
        if (pageIndex) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, 210, 297);
      }
      const url = URL.createObjectURL(pdf.output("blob"));
      const downloadLink = document.createElement("a");
      downloadLink.href = url; downloadLink.download = "trip-itinerary.pdf"; downloadLink.style.display = "none";
      document.body.appendChild(downloadLink); downloadLink.click(); downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPdfStatus("Your PDF download has started.");
    } catch (error) { console.error(error); setPdfError("We couldn't create your PDF. Please try again."); setPdfStatus(""); }
    finally { setDownloading(false); }
  };

  const previewProps = { data: previewData, pages: previewPages, selectedTemplate, editLink };
  const currentDateSummary = useMemo(() => data.startDate && data.returnDate ? `${readableDate(data.startDate)} — ${readableDate(data.returnDate)}` : "", [data.startDate, data.returnDate]);

  return <main>
    <header className="site-header"><div className="nav-shell"><a href="#top" className="brand">Trip Itinerary Maker</a><nav aria-label="Main navigation"><button onClick={scrollToEditor} className="plan-button">Plan My Trip</button><a href="/travel-planner-templates/">Templates <span>▾</span></a><a href="#about">About</a></nav></div></header>
    <section id="top" className="hero"><div><h1>Trip Itinerary Template — Create, Edit &amp; Download Free</h1><p>Free trip itinerary template — fill in, pick a design, download PDF &amp; edit anytime. No sign-up.</p></div></section>
    <section id="trip-editor" className="editor-intro"><h2>Create, download &amp; edit your itinerary anytime — free, no sign-up required</h2><p className="reassurance">Made a mistake? No worries — you can come back and edit anytime after generating. ✏️</p><p>Fill in your trip details below. Your itinerary preview updates automatically.</p></section>
    <div className="workspace">
      <div className="editor-column"><section className="editor-card" aria-label="Trip details form">
        <div className="overview-fields">
          <label className="destination-field">Destination<input value={data.destination} onChange={(e) => setField("destination", e.target.value)} placeholder="For example: Tokyo, Japan" /></label>
          <label>Start date<DatePicker value={data.startDate} onChange={(value) => setField("startDate", value)} ariaLabel="Select start date" /></label>
          <label>Return date<DatePicker value={data.returnDate} min={data.startDate || undefined} onChange={(value) => setField("returnDate", value)} ariaLabel="Select return date" /></label>
        </div>
        {currentDateSummary && <p className="date-summary">{currentDateSummary}</p>}{dateError && <p className="form-error" role="alert">{dateError}</p>}
        <div className="days-editor">
          {data.days.map((day, dayIndex) => <section className="day-section" key={day.id}><h3>{formatDateForDay(data.startDate, dayIndex)}</h3>
            {day.items.map((item, itemIndex) => <div className="item-row" key={item.id}>
              <label className="time-field">Time<span className="time-inputs"><TimePicker value={item.startTime} ariaLabel="Select start time" onChange={(value) => updateItem(dayIndex, itemIndex, "startTime", value)} /><b>—</b><TimePicker value={item.endTime} ariaLabel="Select end time" onChange={(value) => updateItem(dayIndex, itemIndex, "endTime", value)} /></span></label>
              <label className="activity-field">Activity<input value={item.activity} onChange={(e) => updateItem(dayIndex, itemIndex, "activity", e.target.value)} placeholder="Add an activity or plan" /></label>
              <button className="delete-button" onClick={() => deleteItem(dayIndex, itemIndex)}>Delete</button>
            </div>)}
            <div className="day-actions"><button className="text-action" onClick={() => addItem(dayIndex)}><Plus size={15} /> Add itinerary item</button><button className="delete-day" onClick={() => deleteDay(dayIndex)}>Delete day</button></div>
          </section>)}
          <button className="add-day" onClick={addDay}><Plus size={16} /> Add another day</button>
        </div>
        <div className="editor-actions"><Button onClick={() => setModalOpen(true)} className="primary-action"><Expand size={16} /> Continue to preview</Button><Button onClick={downloadPdf} className="secondary-action" disabled={downloading}><Download size={16} /> {downloading ? "Preparing PDF…" : "Download PDF"}</Button></div>{pdfError && <p className="pdf-error" role="alert">{pdfError}</p>}{pdfStatus && <p className="pdf-status" role="status">{pdfStatus}</p>}
      </section>
        <TemplateSelector category={category} setCategory={setCategory} selectedId={selectedTemplateId} onSelect={(template) => { setSelectedTemplateId(template.id); }} />
      </div>
      <aside className="preview-column">
        <PreviewPanel {...previewProps} onFullscreen={() => setModalOpen(true)} />
      </aside>
    </div>
    <section className="mobile-preview"><PreviewPanel {...previewProps} onFullscreen={() => setModalOpen(true)} /></section>
    <section id="about" className="about-section content-width"><h2>About Our Free Trip Itinerary Template</h2><button className="about-toggle" onClick={() => setAboutOpen((open) => !open)} aria-expanded={aboutOpen}>Planning a trip is exciting, but organizing every detail <span>{aboutOpen ? "▾" : "▸"}</span></button><div className={`about-copy ${aboutOpen ? "open" : ""}`}><p>Planning a trip is exciting, but organizing every detail can quickly become overwhelming. Our free trip itinerary template makes it easy. Instead of juggling spreadsheets, notes, and booking confirmations, you can create a clear, beautiful travel itinerary in just a few minutes.</p><p>Start by entering your trip details — dates, destinations, and daily activities. Then choose from our collections of stylish background designs, from sunny and botanical to beach and minimalist. Our online itinerary maker instantly turns your information into a printable PDF itinerary that looks professional enough for visa applications and family road trips alike.</p><p>The best part? Your itinerary is fully editable. Plans change, and yours can too. Come back anytime to update your travel plans — no sign-up, no fees, no complicated software. Every template is free to use, and you can download and print as many copies as you need.</p><p>Whether you are planning a honeymoon, a business trip, or a weekend getaway, our trip itinerary template helps you stay organized and enjoy the journey. Start planning today — it takes less than five minutes.</p></div></section>
    <FaqSection />
    <footer><nav aria-label="Footer navigation"><a href="#top">Trip Itinerary Maker</a><span className="footer-link-arrow" aria-hidden="true">▸</span><span> | </span><a href="#template-section">Trip Planning Templates</a><span className="footer-link-arrow" aria-hidden="true">▸</span><span> | </span><a href="/travel-planner-templates/">Travel Planner Templates</a><span className="footer-link-arrow" aria-hidden="true">▸</span></nav><div className="featured-in"><p className="featured-in-title">Featured In</p><div className="badge-row"><a href="https://toolhunter.ai/ai-tool/trip-itinerary-maker?ref=badge" target="_blank" rel="noopener"><img src="https://toolhunter.ai/badge/trip-itinerary-maker.svg?theme=light" alt="Featured on Toolhunter" height="32" /></a><a href="https://twelve.tools" target="_blank" rel="noopener"><img src="https://twelve.tools/badge0-white.svg" alt="Featured on Twelve Tools" height="32" /></a><a href="https://buildlist.io" target="_blank" rel="noopener"><img src="https://buildlist.io/badge.svg" alt="Featured on Buildlist" height="32" style={{ width: "auto" }} /></a></div></div><p className="footer-copyright">© 2026 Trip Itinerary Maker</p></footer>
    <div className="pagination-measure" aria-hidden="true" ref={paginationMeasureRef}><ItineraryPreview data={previewData} pageDays={previewData.days} selectedTemplate={selectedTemplate} mode="print" /></div>
    <div className="export-stage" aria-hidden="true" ref={exportRef}><ItineraryPreviewPages data={data} pages={pdfPages} selectedTemplate={selectedTemplate} editLink={editLink} mode="print" /></div>
    {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Full itinerary preview"><div className="modal-panel"><div className="modal-header"><h2>Full itinerary preview</h2><div><Button className="secondary-action" onClick={downloadPdf} disabled={downloading}><Download size={16} /> {downloading ? "Preparing PDF…" : "Download PDF"}</Button><button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /> Close preview</button></div></div>{pdfError && <p className="modal-pdf-status pdf-error" role="alert">{pdfError}</p>}{pdfStatus && <p className="modal-pdf-status pdf-status" role="status">{pdfStatus}</p>}<div className="modal-paper"><ItineraryPreviewPages {...previewProps} mode="modal" /></div></div></div>}
  </main>;
}

function ItineraryPreviewPages({ data, pages, selectedTemplate, editLink, mode }: { data: ItineraryData; pages: ItineraryDay[][]; selectedTemplate: Template; editLink: string; mode: "screen" | "modal" | "print" }) {
  return <div className={`preview-pages preview-pages-${mode}`}>{pages.map((pageDays, index) => <ItineraryPreview key={`${pageDays[0]?.id ?? "page"}-${index}`} data={data} pageDays={pageDays} selectedTemplate={selectedTemplate} editLink={editLink} mode={mode} />)}</div>;
}

function PreviewPanel({ data, pages, selectedTemplate, editLink, onFullscreen }: { data: ItineraryData; pages: ItineraryDay[][]; selectedTemplate: Template; editLink: string; onFullscreen: () => void }) {
  return <section className="preview-panel"><div className="section-heading"><div><h2>Your Itinerary Preview</h2><span>LIVE PREVIEW</span></div><button onClick={onFullscreen} aria-label="Open full itinerary preview"><Expand size={17} /></button></div><ItineraryPreviewPages data={data} pages={pages} selectedTemplate={selectedTemplate} editLink={editLink} mode="screen" /></section>;
}

function DatePicker({ value, min, onChange, ariaLabel }: { value: string; min?: string; onChange: (value: string) => void; ariaLabel: string }) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLSpanElement>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => calendarDate(value || min || calendarValue(new Date())));
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(visibleMonth);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  const openPicker = () => { setVisibleMonth(calendarDate(value || min || calendarValue(new Date()))); setOpen(true); };
  return <span className="date-control" ref={pickerRef}>
    <button type="button" className={`date-picker-trigger ${value ? "has-value" : ""}`} aria-label={ariaLabel} aria-expanded={open} onClick={openPicker}>{readableDate(value) || "Select date"}<CalendarDays size={16} /></button>
    {open && <span className="date-picker-popover" role="dialog" aria-label={ariaLabel}>
      <span className="date-picker-header"><button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1, 12))}>‹</button><strong>{monthLabel}</strong><button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1, 12))}>›</button></span>
      <span className="date-picker-weekdays" aria-hidden="true">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day}>{day}</span>)}</span>
      <span className="date-picker-days">{Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
        if (index < firstWeekday) return <span key={`blank-${index}`} aria-hidden="true" />;
        const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - firstWeekday + 1, 12);
        const nextValue = calendarValue(date);
        const disabled = Boolean(min && nextValue < min);
        return <button type="button" key={nextValue} disabled={disabled} className={nextValue === value ? "selected" : ""} aria-pressed={nextValue === value} onClick={() => { onChange(nextValue); setOpen(false); }}>{date.getDate()}</button>;
      })}</span>
    </span>}
  </span>;
}

function TimePicker({ value, ariaLabel, onChange }: { value: string; ariaLabel: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value ? value.slice(0, 2) : "00");
  const pickerRef = useRef<HTMLSpanElement>(null);
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minute = value ? value.slice(3, 5) : "00";

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const openPicker = () => { setHour(value ? value.slice(0, 2) : "00"); setOpen(true); };
  return <span className="time-picker" ref={pickerRef}>
    <button type="button" className="time-picker-trigger" aria-label={ariaLabel} aria-expanded={open} onClick={openPicker}><span>{value || "--:--"}</span><Clock3 size={16} /></button>
    {open && <span className="time-picker-popover" role="group" aria-label={`${ariaLabel} options`}>
      <span className="time-picker-column"><span className="time-picker-label">Hour</span><span className="time-picker-options" role="listbox" aria-label="Hour">{hours.map((option) => <button type="button" role="option" aria-selected={hour === option} className={hour === option ? "selected" : ""} key={option} onClick={() => { setHour(option); onChange(`${option}:${minute}`); }}>{option}</button>)}</span></span>
      <span className="time-picker-column"><span className="time-picker-label">Minute</span><span className="time-picker-options" role="listbox" aria-label="Minute">{minutes.map((option) => <button type="button" role="option" aria-selected={minute === option} className={minute === option ? "selected" : ""} key={option} onClick={() => { onChange(`${hour}:${option}`); setOpen(false); }}>{option}</button>)}</span></span>
    </span>}
  </span>;
}

function TemplateSelector({ category, setCategory, selectedId, onSelect }: { category: TemplateCategory; setCategory: (value: TemplateCategory) => void; selectedId: string; onSelect: (template: Template) => void }) {
  const renderCard = (template: Template) => {
    const selected = template.id === selectedId;
    return <button className={`template-card ${selected ? "selected" : ""}`} onClick={() => onSelect(template)} key={template.id}>{template.thumbnail ? <img src={template.thumbnail} width="300" height="424" alt={`${template.name} trip itinerary template`} loading="lazy" /> : <span className="plain-thumb" />}<span>{template.name}</span>{selected && <i><Check size={12} /></i>}</button>;
  };

  return <section className="template-section" id="template-section"><h2>Choose your itinerary background</h2><div className="template-section-subheading"><p>Pick a design that matches your trip.</p><a href="/travel-planner-templates/" className="browse-all-link">Browse all 40+ free travel planner templates <span aria-hidden="true">→</span></a></div><div className="category-tabs" aria-label="Template categories">{categoryDefinitions.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={category === item.id ? "active" : ""}>{item.label}</button>)}</div>{templateStyles.map((style) => <div key={style} className={`template-grid ${category === style ? "" : "hidden"}`}>{templateRecords.filter((template) => template.category === style).map((template) => renderCard(createTemplate(template)))}</div>)}<div className={`template-grid ${category === "original-text" ? "" : "hidden"}`}>{renderCard(originalTextTemplate)}</div></section>;
}

function FaqSection() {
  const faqs = [["How do I use a trip itinerary template?", "Fill in your trip details — destination, dates, daily activities — on our free online itinerary maker. Your itinerary preview updates automatically. When you are happy with it, download as a printable PDF. Plans change? Come back anytime and edit your itinerary online."], ["What is the best template for creating a travel itinerary?", "The best trip itinerary template lets you fill in your trip details once and get a clean, printable PDF. Pick a background style that matches your trip — sunny, botanical, minimalist, vintage, floral, or cute — and your itinerary looks as good as it reads. Come back and edit it anytime, no sign-up required."], ["Can I edit my itinerary after downloading it?", "Yes. Your itinerary is always editable online. After downloading your PDF, you can come back anytime to update your plans — add new activities, change dates, or switch templates. Just save your edit link. No sign-up required."], ["Can I change the template design after I have already filled in my itinerary?", "Yes. Click any template to switch the background design instantly — your itinerary data stays the same. Choose from sunny, botanical, minimalist, vintage, floral, and cute styles. The preview updates as you switch, so you can find the perfect look before downloading."], ["Do I need to create an account?", "No. Our trip itinerary maker is completely free, and you never need to create an account. Just fill in your trip details, choose a design, and download your PDF. Come back anytime using your edit link."], ["What is an example of a travel itinerary?", "An example of a travel itinerary is a day-by-day schedule showing flights, hotel check-in times, activities, meals, and transport. Try our free itinerary maker to see the exact format — fill in your details, pick a template, and see your itinerary preview instantly."], ["How do I write a travel itinerary?", "Write a travel itinerary by planning one day at a time — list the date, times, activities, locations, and notes for each day. Our online itinerary maker saves you time: just fill in the fields, and your preview updates automatically. No need to format anything — it is ready to download as a PDF."]];
  return <section className="faq-section content-width"><h2>Frequently Asked Questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>;
}
