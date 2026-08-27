export type DemoItineraryDay = {
  day: string;
  items: Array<{ time: string; activity: string }>;
};

export const demoItinerary: DemoItineraryDay[] = [
  {
    day: "Day 1 — Left Bank Classics",
    items: [
      { time: "09:00–10:30", activity: "Climb the Eiffel Tower for panoramic views, starting with photos on the Champ de Mars lawn." },
      { time: "11:15–12:30", activity: "Walk beside the Seine and browse the bookstalls on the way to Saint-Germain-des-Prés." },
      { time: "13:00–14:30", activity: "Enjoy a relaxed Left Bank lunch at a classic Parisian café." },
    ],
  },
  {
    day: "Day 2 — Art & Montmartre",
    items: [
      { time: "09:30–12:00", activity: "Explore Impressionist masterpieces at the Musée d'Orsay." },
      { time: "12:30–13:45", activity: "Have lunch in the Tuileries area before crossing to the Right Bank." },
      { time: "15:30–18:00", activity: "Ride up to Montmartre, visit Sacré-Cœur, and wander the artists' square." },
    ],
  },
  {
    day: "Day 3 — Markets & Marais",
    items: [
      { time: "09:00–10:30", activity: "Start with pastries and coffee near Marché des Enfants Rouges." },
      { time: "11:00–13:00", activity: "Discover galleries, boutiques, and historic lanes in Le Marais." },
      { time: "18:00–19:30", activity: "Finish with a sunset river cruise and views of Paris after dark." },
    ],
  },
];
