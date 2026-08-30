import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import templates from "@/data/templates.json";
import { TemplateDemo } from "@/components/template-demo";
import { demoItinerary } from "@/src/data/demoItinerary";
import type { Template } from "@/components/itinerary-preview";
import styles from "./page.module.css";

const siteUrl = "https://www.tripitinerarymaker.com";

export const metadata: Metadata = {
  title: "Travel Planner Templates - Free Printable & Editable",
  description: "Free travel planner template — plan trips, edit online & print in minutes. No sign-up needed.",
  alternates: { canonical: "/travel-planner-templates/" },
  openGraph: {
    title: "Travel Planner Templates - Free Printable & Editable",
    description: "Free travel planner template — plan trips, edit online & print in minutes. No sign-up needed.",
    url: `${siteUrl}/travel-planner-templates/`,
    images: [{ url: "/og-cover.png", width: 1200, height: 630 }],
  },
};

const categories = [
  {
    id: "architectural",
    heading: "Architectural Travel Planner Templates",
    description: "Clean lines, structured grids, and bold geometry define this style. Built for travelers who appreciate design — from architects and urban explorers to anyone who likes their plans as precise as a blueprint.",
  },
  {
    id: "cute-playful",
    heading: "Cute & Playful Travel Planner Templates",
    description: "Rounded fonts, cheerful colors, and tiny illustrated details make planning feel like fun. Perfect for family trips, friends' getaways, or anyone who wants a planner that smiles back at them.",
  },
  {
    id: "floral",
    heading: "Floral Travel Planner Templates",
    description: "Delicate flowers and soft botanical accents bring a romantic touch to your travel plans. A natural fit for honeymoons, garden tours, and springtime escapes — or any trip you want to feel a little more elegant.",
  },
  {
    id: "animal",
    heading: "Animal-Themed Travel Planner Templates",
    description: "Adorable animal illustrations give your planner personality — from hiking buddies to safari companions. Kids love it, pet owners love it, and it makes any trip feel more playful.",
  },
  {
    id: "minimalist",
    heading: "Minimalist Travel Planner Templates",
    description: "Nothing extra. Just clean typography, generous white space, and a layout that gets out of your way. Made for business trips, focused travelers, and anyone who wants their plan to be as simple as it is clear.",
  },
  {
    id: "sunny",
    heading: "Sunny & Bright Travel Planner Templates",
    description: "Bright yellows, warm gradients, and sun-drenched layouts that instantly put you in vacation mode. Ideal for beach escapes, summer road trips, and any destination where the forecast is all sunshine.",
  },
  {
    id: "vintage",
    heading: "Vintage Travel Planner Templates",
    description: "Muted tones, retro borders, and a nostalgic postcard feel that makes every plan look like a classic. Perfect for European city breaks, museum hopping, and travelers who love old-world charm.",
  },
  {
    id: "original-text",
    heading: "Original Text Travel Planner Templates",
    description: "Clean, straightforward text-only layouts that prioritize readability above all. The most practical choice for printing, sharing, and packing — your plan stays easy to scan even in the smallest font.",
  },
] as const;

const collectionPageLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Travel Planner Templates",
  url: `${siteUrl}/travel-planner-templates/`,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: templates.map((template, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: template.name || template.id,
      url: `${siteUrl}/travel-planner-templates/#${template.id}`,
    })),
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${siteUrl}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Travel Planner Templates",
      item: `${siteUrl}/travel-planner-templates/`,
    },
  ],
};

function thumbnailPath(image: string) {
  return image.replace("/previews/", "/thumbnails/").replace("-preview.webp", "-thumb.webp");
}

function toPreviewTemplate(template: typeof templates[number]): Template {
  return {
    id: template.id,
    name: template.name,
    image: template.image || undefined,
    thumbnail: template.image ? thumbnailPath(template.image) : undefined,
  };
}

export default function TravelPlannerTemplatesPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageLd) }} />
    <header className="site-header"><div className="nav-shell">
      <Link href="/" className="brand">Trip Itinerary Maker</Link>
      <nav aria-label="Main navigation"><Link href="/" className="plan-button">Plan My Trip</Link><Link href="/travel-planner-templates/">Templates <span>▾</span></Link><Link href="/#about">About</Link></nav>
    </div></header>
    <main>
      <section className={styles.hero}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}><ol><li><Link href="/">Home</Link><span aria-hidden="true">›</span></li><li aria-current="page">Travel Planner Templates</li></ol></nav>
        <h1>Travel Planner Templates — Fill, Preview &amp; Export PDF</h1>
        <p>Pick from 8 handcrafted travel planner template styles — fill in your trip details, preview your design, and export a polished PDF in seconds.</p>
      </section>
      <div className={styles.pageBody}>
        {categories.map((category) => {
          const categoryTemplates = templates.filter((template) => template.category === category.id);
          return <section className={styles.category} aria-labelledby={`${category.id}-heading`} key={category.id}>
            <div className={styles.categoryIntro}><h2 id={`${category.id}-heading`}>{category.heading}</h2><p>{category.description}</p></div>
            <div className={styles.templateGrid}>
              {categoryTemplates.map((template, index) => {
                if (index === 0) return <TemplateDemo key={template.id} template={toPreviewTemplate(template)} description={template.description} bestFor={template.bestFor} demoData={demoItinerary} />;
                return <article className={styles.templateCard} id={template.id} key={template.id}>
                <Link href={`/?template=${template.id}`} className={styles.imageLink} aria-label={`Use the ${template.name} travel planner template`}>
                  {template.image ? <Image src={thumbnailPath(template.image)} alt={`${template.name} — free printable travel planner template`} width={300} height={424} sizes="(max-width: 767px) calc((100vw - 52px) / 2), (max-width: 1023px) calc((100vw - 104px) / 3), 210px" loading="lazy" /> : <span className={styles.plainPaper} aria-hidden="true"><span>TRIP ITINERARY</span><i /><i /><i /><i /></span>}
                </Link>
                <div className={styles.cardCopy}><div className={styles.templateName}>{template.name}</div><p>{template.description}</p><span>{template.bestFor}</span><Link href={`/?template=${template.id}`} className={styles.useTemplateButton}>Use this template</Link></div>
              </article>;
              })}
            </div>
          </section>;
        })}
        <section className={styles.howTo} aria-labelledby="how-to-use"><h2 id="how-to-use">How to Use These Travel Planner Templates</h2><div className={styles.steps}>
          <article><span>Step 1</span><h3>Browse the 8 template categories</h3><p>Start with the style that fits you — minimal, floral, vintage, cute &amp; playful, or any of the other designs. Each category shows real previews, so you can see exactly what your final PDF will look like before you choose.</p></article>
          <article><span>Step 2</span><h3>Pick your template</h3><p>Choose the layout that matches your trip. Every travel planner template is ready to fill in right away — no setup, no account needed.</p></article>
          <article><span>Step 3</span><h3>Fill in your trip details</h3><p>Add your destination, travel dates, and daily plans directly into the template. Every section is editable, so you can add or remove rows whenever you need.</p></article>
          <article><span>Step 4</span><h3>Export as PDF — and keep editing anytime</h3><p>Preview your finished planner, download a print-ready PDF, and save the editable link so you can come back and update it whenever your plans change.</p></article>
        </div></section>
        <section className={styles.sampleItinerary} aria-labelledby="sample-itinerary">
          <h2 id="sample-itinerary">Sample Itinerary: 3 Days in Paris</h2>
          <p className={styles.sampleIntro}>Prefer to see what a finished planner looks like? Here&apos;s a real 3-day Paris itinerary filled into our templates.</p>
          <div className={styles.sampleDays}>
            {demoItinerary.map((day) => (
              <section key={day.day} className={styles.sampleDay}>
                <h3>{day.day}</h3>
                <ul>
                  {day.items.map((item) => <li key={`${item.time}-${item.activity}`}><time>{item.time}</time> — {item.activity}</li>)}
                </ul>
              </section>
            ))}
          </div>
          <Link href="/" className={styles.sampleLink}>Use this template to plan your own trip →</Link>
        </section>
        <section className={styles.faq} aria-labelledby="faq"><h2 id="faq">Frequently Asked Questions</h2>
          <details><summary>Are these travel planner templates really free?<span>+</span></summary><p>Yes, every template on this page is completely free to use. Fill in your details, export as PDF, and keep your editable link — no payment, no trial, no sign-up required.</p></details>
          <details><summary>Can I customize the template colors and layout?<span>+</span></summary><p>Each template comes with a fixed design that you can fill with your own content. While the layout style is preset, you can preview how your information fits before exporting.</p></details>
          <details><summary>What&apos;s the difference between 8 template styles?<span>+</span></summary><p>They&apos;re different visual designs for the same travel planner layout. Minimalist is clean and simple, Floral has decorative botanical elements, Vintage has a retro feel, Animal features playful illustrations, and so on — pick the one that matches your travel style.</p></details>
          <details><summary>Can I edit my travel planner after I export it?<span>+</span></summary><p>Yes. After you export your PDF, you&apos;ll get a unique link. Click it anytime to reopen your travel planner, make changes, and export again. Your data stays saved.</p></details>
        </section>
      </div>
    </main>
    <footer><nav aria-label="Footer navigation"><Link href="/#top">Trip Itinerary Maker</Link><span className="footer-link-arrow" aria-hidden="true">▸</span><span> | </span><Link href="/#template-section">Trip Planning Templates</Link><span className="footer-link-arrow" aria-hidden="true">▸</span><span> | </span><Link href="/travel-planner-templates/">Travel Planner Templates</Link><span className="footer-link-arrow" aria-hidden="true">▸</span></nav><a className="toolhunter-badge" href="https://toolhunter.ai/ai-tool/trip-itinerary-maker?ref=badge" target="_blank" rel="noopener"><img src="https://toolhunter.ai/badge/trip-itinerary-maker.svg?theme=light" alt="Featured on Toolhunter" width="200" height="50" /></a><p className="footer-copyright">© 2026 Trip Itinerary Maker</p></footer>
  </>;
}
