"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Download, Expand, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryPreview, type ItineraryData, type ItineraryDay, type ItineraryItem, type Template, readableDate } from "@/components/itinerary-preview";

const templatesByCategory = {
  Sunny: ["Sunny Holiday 01", "Clear Sky Escape 02", "Orange Sunset 03", "Morning Glow 04", "Seaside Vacation 05"],
  Botanical: ["Forest Morning 01", "Mountain Mist 02", "Nature Walk 03", "Green Retreat 04", "Wild Meadow 05"],
  Minimalist: ["Quiet Space 01", "Soft Paper 02", "Calm Lines 03", "Open Notes 04", "Simple Route 05"],
  Vintage: ["Film Journey 01", "Old Times 02", "Postcard Route 03", "Classic Escape 04", "Golden Memory 05"],
  Floral: ["Flower Trip 01", "Rose Letter 02", "Spring Garden 03", "Petal Weekend 04", "Blooming Route 05"],
  "Cute & Playful": ["Cloud Journey 01", "Colorful Holiday 02", "Happy Departure 03", "Little Adventure 04", "Sunny Friends 05"],
  "Original Text": ["Plain Paper"],
} as const;

const availableTemplates: Template[] = [
  { id: "sunny-holiday-01", name: "Sunny Holiday 01", image: "/templates/sunny-holiday-01.webp" },
  { id: "plain-paper", name: "Plain Paper" },
];

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

export function ItineraryMaker() {
  const [data, setData] = useState<ItineraryData>(() => freshData());
  const [previewData, setPreviewData] = useState<ItineraryData>(() => freshData());
  const [selectedTemplateId, setSelectedTemplateId] = useState("sunny-holiday-01");
  const [category, setCategory] = useState<keyof typeof templatesByCategory>("Sunny");
  const [dateError, setDateError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editLink, setEditLink] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfStatus, setPdfStatus] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const selectedTemplate = availableTemplates.find((item) => item.id === selectedTemplateId) ?? availableTemplates[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewData(data), 300);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/edit\/([^/]+)/);
    const params = new URLSearchParams(window.location.search);
    const requestedId = pathMatch?.[1] ?? params.get("edit");
    const stored = window.localStorage.getItem("trip-itinerary-draft");
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as Draft;
      if (!requestedId || draft.id === requestedId) {
        const restored = draft.data?.days?.length ? draft.data : freshData();
        setData(restored); setPreviewData(restored); setSelectedTemplateId(draft.selectedTemplateId || "sunny-holiday-01");
        setEditLink(`${window.location.origin}/edit/${draft.id}`);
      }
    } catch { window.localStorage.removeItem("trip-itinerary-draft"); }
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
  const addDay = () => {
    const max = durationDays(data.startDate, data.returnDate);
    if (max !== null && data.days.length >= max) { setDateError("All days in your selected travel dates are already included."); return; }
    setDateError(""); updateData((previous) => ({ ...previous, days: [...previous.days, freshDay()] }));
  };
  const scrollToTemplates = () => document.getElementById("template-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const paper = exportRef.current.querySelector(".itinerary-paper") as HTMLElement;
      await document.fonts.ready;
      await Promise.all(Array.from(paper.querySelectorAll("img")).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); })));
      const canvas = await html2canvas(paper, { scale: 2, useCORS: true, backgroundColor: "#fffdf8", logging: false });
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = 210, pageHeight = 297, imageHeight = canvas.height * pageWidth / canvas.width;
      let y = 0, remaining = imageHeight;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, y, pageWidth, imageHeight);
      remaining -= pageHeight;
      while (remaining > 0) { y -= pageHeight; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, y, pageWidth, imageHeight); remaining -= pageHeight; }
      const url = URL.createObjectURL(pdf.output("blob"));
      const downloadLink = document.createElement("a");
      downloadLink.href = url; downloadLink.download = "trip-itinerary.pdf"; downloadLink.style.display = "none";
      document.body.appendChild(downloadLink); downloadLink.click(); downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPdfStatus("Your PDF download has started.");
    } catch (error) { console.error(error); setPdfError("We couldn't create your PDF. Please try again."); setPdfStatus(""); }
    finally { setDownloading(false); }
  };

  const selectedCategoryTemplates = templatesByCategory[category];
  const previewProps = { data: previewData, selectedTemplate, editLink };
  const currentDateSummary = useMemo(() => data.startDate && data.returnDate ? `${readableDate(data.startDate)} — ${readableDate(data.returnDate)}` : "", [data.startDate, data.returnDate]);

  return <main>
    <header className="site-header"><div className="nav-shell"><a href="#top" className="brand">Trip Itinerary Maker</a><nav aria-label="Main navigation"><button onClick={scrollToEditor} className="plan-button">Plan My Trip</button><a href="#template-section">Templates <span>▾</span></a><a href="#about">About</a></nav></div></header>
    <section id="top" className="hero"><div><h1>Free Trip Itinerary Template — Create, Download &amp; Edit Online</h1><p>Free trip itinerary template — fill in, pick a design, download PDF &amp; edit anytime. No sign-up.</p></div></section>
    <section id="trip-editor" className="editor-intro"><h2>Create, download &amp; edit your itinerary anytime — free, no sign-up required</h2><p className="reassurance">Made a mistake? No worries — you can come back and edit anytime after generating. ✏️</p><p>Fill in your trip details below. Your itinerary preview updates automatically.</p></section>
    <div className="workspace">
      <div className="editor-column"><section className="editor-card" aria-label="Trip details form">
        <div className="overview-fields">
          <label className="destination-field">Destination<input value={data.destination} onChange={(e) => setField("destination", e.target.value)} placeholder="For example: Tokyo, Japan" /></label>
          <label>Start date<span className="date-control"><input type="date" value={data.startDate} onChange={(e) => setField("startDate", e.target.value)} aria-label="Select start date" /><span className={data.startDate ? "has-value" : ""}>{readableDate(data.startDate) || "Select start date"}<CalendarDays size={16} /></span></span></label>
          <label>Return date<span className="date-control"><input type="date" min={data.startDate || undefined} value={data.returnDate} onChange={(e) => setField("returnDate", e.target.value)} aria-label="Select return date" /><span className={data.returnDate ? "has-value" : ""}>{readableDate(data.returnDate) || "Select return date"}<CalendarDays size={16} /></span></span></label>
        </div>
        {currentDateSummary && <p className="date-summary">{currentDateSummary}</p>}{dateError && <p className="form-error" role="alert">{dateError}</p>}
        <div className="days-editor">
          {data.days.map((day, dayIndex) => <section className="day-section" key={day.id}><h3>{formatDateForDay(data.startDate, dayIndex)}</h3>
            {day.items.map((item, itemIndex) => <div className="item-row" key={item.id}>
              <label className="time-field">Time<span className="time-inputs"><input type="time" value={item.startTime} onChange={(e) => updateItem(dayIndex, itemIndex, "startTime", e.target.value)} /><b>—</b><input type="time" value={item.endTime} onChange={(e) => updateItem(dayIndex, itemIndex, "endTime", e.target.value)} /></span></label>
              <label className="activity-field">Activity<input value={item.activity} onChange={(e) => updateItem(dayIndex, itemIndex, "activity", e.target.value)} placeholder="Add an activity or plan" /></label>
              <button className="delete-button" onClick={() => deleteItem(dayIndex, itemIndex)}>Delete</button>
            </div>)}
            <button className="text-action" onClick={() => addItem(dayIndex)}><Plus size={15} /> Add itinerary item</button>
          </section>)}
          <button className="add-day" onClick={addDay}><Plus size={16} /> Add another day</button>
        </div>
        <div className="editor-actions"><Button onClick={() => setModalOpen(true)} className="primary-action"><Expand size={16} /> Continue to preview</Button><Button onClick={downloadPdf} className="secondary-action" disabled={downloading}><Download size={16} /> {downloading ? "Preparing PDF…" : "Download PDF"}</Button></div>{pdfError && <p className="pdf-error" role="alert">{pdfError}</p>}{pdfStatus && <p className="pdf-status" role="status">{pdfStatus}</p>}
      </section>
        <TemplateSelector category={category} setCategory={setCategory} names={selectedCategoryTemplates} selectedId={selectedTemplateId} onSelect={(template) => { setSelectedTemplateId(template.id); }} />
      </div>
      <aside className="preview-column">
        <PreviewPanel {...previewProps} onChangeTemplate={scrollToTemplates} onFullscreen={() => setModalOpen(true)} />
      </aside>
    </div>
    <section className="mobile-preview"><PreviewPanel {...previewProps} onChangeTemplate={scrollToTemplates} onFullscreen={() => setModalOpen(true)} /></section>
    <section id="about" className="about-section content-width"><h2>About Our Free Trip Itinerary Template</h2><button className="about-toggle" onClick={() => setAboutOpen((open) => !open)} aria-expanded={aboutOpen}>Planning a trip is exciting, but organizing every detail <span>{aboutOpen ? "▾" : "▸"}</span></button><div className={`about-copy ${aboutOpen ? "open" : ""}`}><p>Planning a trip is exciting, but organizing every detail can quickly become overwhelming. Our free trip itinerary template makes it easy. Instead of juggling spreadsheets, notes, and booking confirmations, you can create a clear, beautiful travel itinerary in just a few minutes.</p><p>Start by entering your trip details — dates, destinations, and daily activities. Then choose from our collections of stylish background designs, from sunny and botanical to beach and minimalist. Our online itinerary maker instantly turns your information into a printable PDF itinerary that looks professional enough for visa applications and family road trips alike.</p><p>The best part? Your itinerary is fully editable. Plans change, and yours can too. Come back anytime to update your travel plans — no sign-up, no fees, no complicated software. Every template is free to use, and you can download and print as many copies as you need.</p><p>Whether you are planning a honeymoon, a business trip, or a weekend getaway, our trip itinerary template helps you stay organized and enjoy the journey. Start planning today — it takes less than five minutes.</p></div></section>
    <FaqSection />
    <footer><nav aria-label="Footer navigation"><a href="#top">Trip Itinerary Maker</a><span> | </span><a href="#template-section">Trip Planning Templates</a><span> | </span><a href="#trip-editor">Travel Planner Templates</a></nav></footer>
    <div className="export-stage" aria-hidden="true" ref={exportRef}><ItineraryPreview data={data} selectedTemplate={selectedTemplate} editLink={editLink} mode="print" /></div>
    {modalOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Full itinerary preview"><div className="modal-panel"><div className="modal-header"><h2>Full itinerary preview</h2><div><Button className="secondary-action" onClick={downloadPdf} disabled={downloading}><Download size={16} /> {downloading ? "Preparing PDF…" : "Download PDF"}</Button><button className="modal-close" onClick={() => setModalOpen(false)}><X size={18} /> Close preview</button></div></div>{pdfError && <p className="modal-pdf-status pdf-error" role="alert">{pdfError}</p>}{pdfStatus && <p className="modal-pdf-status pdf-status" role="status">{pdfStatus}</p>}<div className="modal-paper"><ItineraryPreview {...previewProps} mode="modal" /></div></div></div>}
  </main>;
}

function PreviewPanel({ data, selectedTemplate, editLink, onChangeTemplate, onFullscreen }: { data: ItineraryData; selectedTemplate: Template; editLink: string; onChangeTemplate: () => void; onFullscreen: () => void }) {
  return <section className="preview-panel"><div className="section-heading"><div><h2>Your Itinerary Preview</h2><span>LIVE PREVIEW</span></div><button onClick={onFullscreen} aria-label="Open full itinerary preview"><Expand size={17} /></button></div><ItineraryPreview data={data} selectedTemplate={selectedTemplate} editLink={editLink} /><div className="template-note"><p>Current template: <strong>{selectedTemplate.name}</strong></p><button onClick={onChangeTemplate}>Change template ↓</button></div></section>;
}

function TemplateSelector({ category, setCategory, names, selectedId, onSelect }: { category: keyof typeof templatesByCategory; setCategory: (value: keyof typeof templatesByCategory) => void; names: readonly string[]; selectedId: string; onSelect: (template: Template) => void }) {
  return <section className="template-section" id="template-section"><h2>Choose your itinerary background</h2><p>Pick a design that matches your trip.</p><div className="category-tabs" aria-label="Template categories">{Object.keys(templatesByCategory).map((item) => <button key={item} onClick={() => setCategory(item as keyof typeof templatesByCategory)} className={category === item ? "active" : ""}>{item}</button>)}</div><div className="template-grid">{names.map((name) => {
    const template = availableTemplates.find((item) => item.name === name); if (!template) return <div className="template-slot" key={name} aria-hidden="true" />;
    const selected = template.id === selectedId;
    return <button className={`template-card ${selected ? "selected" : ""}`} onClick={() => onSelect(template)} key={template.id}>{template.image ? <img src={template.image} width="1024" height="1536" alt="" loading="lazy" /> : <span className="plain-thumb" />}<span>{template.name}</span>{selected && <i><Check size={12} /></i>}</button>;
  })}</div></section>;
}

function FaqSection() {
  const faqs = [["How do I use a trip itinerary template?", "Fill in your trip details — destination, dates, daily activities — on our free online itinerary maker. Your itinerary preview updates automatically. When you are happy with it, download as a printable PDF. Plans change? Come back anytime and edit your itinerary online."], ["What is the best template for creating a travel itinerary?", "The best trip itinerary template lets you fill in your trip details once and get a clean, printable PDF. Pick a background style that matches your trip — sunny, botanical, minimalist, vintage, floral, or cute — and your itinerary looks as good as it reads. Come back and edit it anytime, no sign-up required."], ["Can I edit my itinerary after downloading it?", "Yes. Your itinerary is always editable online. After downloading your PDF, you can come back anytime to update your plans — add new activities, change dates, or switch templates. Just save your edit link. No sign-up required."], ["Can I change the template design after I have already filled in my itinerary?", "Yes. Click any template to switch the background design instantly — your itinerary data stays the same. Choose from sunny, botanical, minimalist, vintage, floral, and cute styles. The preview updates as you switch, so you can find the perfect look before downloading."], ["Do I need to create an account?", "No. Our trip itinerary maker is completely free, and you never need to create an account. Just fill in your trip details, choose a design, and download your PDF. Come back anytime using your edit link."], ["What is an example of a travel itinerary?", "An example of a travel itinerary is a day-by-day schedule showing flights, hotel check-in times, activities, meals, and transport. Try our free itinerary maker to see the exact format — fill in your details, pick a template, and see your itinerary preview instantly."], ["How do I write a travel itinerary?", "Write a travel itinerary by planning one day at a time — list the date, times, activities, locations, and notes for each day. Our online itinerary maker saves you time: just fill in the fields, and your preview updates automatically. No need to format anything — it is ready to download as a PDF."]];
  return <section className="faq-section content-width"><h2>Frequently Asked Questions</h2>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>;
}
