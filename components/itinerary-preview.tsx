"use client";

export type ItineraryItem = { id: string; startTime: string; endTime: string; activity: string; notes: string };
export type ItineraryDay = { id: string; items: ItineraryItem[]; sourceIndex?: number; label?: string };
export type ItineraryData = { destination: string; startDate: string; returnDate: string; days: ItineraryDay[] };
export type Template = { id: string; name: string; image?: string; thumbnail?: string };

export function readableDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

function dayDate(startDate: string, index: number) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + index);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function ItineraryPreview({ data, selectedTemplate, editLink, id, pageDays, mode = "screen" }: {
  data: ItineraryData; selectedTemplate: Template; editLink?: string; id?: string; pageDays?: ItineraryDay[]; mode?: "screen" | "modal" | "print";
}) {
  const displayedDays = pageDays ?? data.days;
  return <article id={id} className={`itinerary-paper preview-${mode}`} aria-label="Travel itinerary preview">
    {selectedTemplate.image && <img className="paper-art" src={selectedTemplate.image} alt="" width="1024" height="1536" loading={mode === "screen" ? "lazy" : "eager"} />}
    <div className="paper-wash" />
    <div className="paper-body">
      <div className="paper-kicker">TRIP ITINERARY</div>
      <h3>{data.destination || "Your destination"}</h3>
      <div className="paper-dates">
        <span>{readableDate(data.startDate) || "Start date"}</span><span>—</span><span>{readableDate(data.returnDate) || "Return date"}</span>
      </div>
      <div className="paper-rule" />
      <div className="paper-days">
        {displayedDays.map((day, index) => <section key={day.id} className="paper-day" data-itinerary-day={day.id}>
          <h4>{day.label || dayDate(data.startDate, day.sourceIndex ?? index) || "Your day plan"}</h4>
          {day.items.some((item) => item.startTime || item.endTime || item.activity || item.notes) ? day.items.map((item) => <div className="paper-item" key={item.id}>
            <div className="paper-time">{item.startTime || "—"}{item.endTime ? ` — ${item.endTime}` : ""}</div>
            <div><strong>{item.activity || "Activity"}</strong></div>
          </div>) : <p className="paper-empty">Add your plans to see them here.</p>}
        </section>)}
      </div>
      {editLink && <div className="paper-edit">Edit this itinerary anytime:<br /><a href={editLink}>{editLink}</a></div>}
      <div className="paper-footer">Trip Itinerary Maker</div>
    </div>
  </article>;
}
