import { LeadForm } from "../components/LeadForm";
import { KNOWN_ACTIVITY_NAMES } from "../lib/constants";
 
const ACTIVITY_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: "🤿 Scuba Diving",
    body: "Scuba diving is the crown jewel of Andaman water adventures. Beginners can do a Discover Scuba Dive at North Bay Island in Port Blair, while certified divers often prefer more advanced dive sites. Pricing typically starts around ₹4,500 for an introductory dive, with multi-dive packages available for certified divers.",
  },
  {
    title: "🚶 Sea Walking (Underwater Helmet Walk)",
    body: "Sea walking lets anyone — including non-swimmers — walk on the ocean bed wearing a helmet that feeds air continuously. It’s available at North Bay Island and Elephant Beach (Havelock). Underwater time is usually ~20 minutes, with guides present throughout.",
  },
  {
    title: "🐠 Snorkeling",
    body: "Snorkeling is available at North Bay Island (Port Blair), Elephant Beach (Havelock), and Neil Island’s Bharatpur Beach. It’s one of the most accessible activities to explore coral reefs and reef fish in shallow, clear water with a guide.",
  },
  {
    title: "🪂 Parasailing",
    body: "Parasailing combines airborne and water adventure — you’re harnessed to a parachute and towed by a speedboat. Common spots include the Rajiv Gandhi Water Sports Complex, Havelock Island, and North Bay Beach. Safety restrictions can apply by age and conditions.",
  },
  {
    title: "🛥️ Jet Skiing",
    body: "Jet ski rides are popular at Corbyn’s Cove Beach and the Rajiv Gandhi Water Sports Complex in Port Blair, and also available at Elephant Beach, Havelock. Typically suitable from ~10+ years with a briefing and life jacket.",
  },
  {
    title: "⚡ Speed Boat Rides",
    body: "Speed boat rides operate from the Andaman Water Sports Complex and commonly connect Port Blair with nearby islands like Ross and North Bay. They work as both transport and a quick thrill ride.",
  },
  {
    title: "🍌 Banana Boat Rides",
    body: "A banana-shaped inflatable boat towed by a speedboat, usually seating up to 6 people. Often available at the Rajiv Gandhi Water Sports Complex, plus Havelock and Neil Island operators depending on season.",
  },
  {
    title: "🔭 Glass Bottom Boat Ride",
    body: "The glass bottom boat lets you witness marine life without getting wet — great for kids, elders, and anyone uncomfortable underwater. Commonly offered at North Bay Island and Neil Island’s Bharatpur Beach.",
  },
  {
    title: "🚢 Semi Submarine",
    body: "A semi-submarine offers panoramic underwater views without any swimming or diving. It’s a family-friendly option for a more immersive reef viewing experience.",
  },
  {
    title: "🛶 Kayaking & Mangrove Kayaking",
    body: "Standard kayaking is available at multiple beaches for relaxed exploration. Mangrove kayaking takes you through scenic channels near Port Blair and Havelock, offering a tranquil eco-adventure with unique landscapes.",
  },
  {
    title: "🏄 Windsurfing & Water Skiing",
    body: "The Rajiv Gandhi Water Sports Complex in Port Blair offers classic sports like windsurfing, water skiing, and sail/row boats. These are ideal for skill-based experiences with instructor support.",
  },
  {
    title: "🏎️ Sea Karting",
    body: "Sea karting is an emerging activity in Andaman — motorized karts on water that even non-swimmers can enjoy under supervision. It’s a newer offering and a strong differentiator for adventure seekers.",
  },
  {
    title: "🎣 Sport Fishing / Angling",
    body: "Open-sea angling trips are available with guided crews. It’s popular for travelers who want a calmer on-water experience while still exploring the sea beyond the shoreline.",
  },
  {
    title: "✈️ Seaplane Ride",
    body: "A seaplane ride provides an aerial view of the Andaman archipelago — turquoise lagoons, beaches, and island chains — positioned as a premium/luxury experience depending on availability.",
  },
  {
    title: "🛳️ Harbour Cruise & Dinner Cruise",
    body: "Evening harbour and dinner cruises offer scenic views of Port Blair harbour and a relaxed experience for couples and families. Availability and inclusions vary by operator and season.",
  },
];
 
const HOTSPOTS: Array<{ location: string; activities: string }> = [
  {
    location: "North Bay Island, Port Blair",
    activities: "Scuba, Sea Walk, Snorkeling, Jet Ski, Glass Bottom, Speed Boat",
  },
  {
    location: "Corbyn’s Cove Beach, Port Blair",
    activities: "Jet Ski, Parasailing, Speed Boat",
  },
  {
    location: "Rajiv Gandhi Water Sports Complex",
    activities: "Water Skiing, Windsurfing, Banana Boat, Parasailing, Sail/Row Boats",
  },
  {
    location: "Chidiyatapu, Port Blair",
    activities: "Advanced Scuba Diving (season/operator dependent)",
  },
  {
    location: "Elephant Beach, Havelock",
    activities: "Snorkeling, Sea Walk, Scuba, Jet Ski",
  },
  {
    location: "Bharatpur Beach, Neil Island",
    activities: "Scuba, Jet Ski, Glass Bottom, Banana Boat",
  },
  {
    location: "Jolly Buoy Island",
    activities: "Kayaking, Snorkeling, Day Trips",
  },
];
 
export const WaterAdventuresGuidePage = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Water Adventures in Port Blair & Andaman Islands</h1>
        <p className="max-w-3xl text-slate-600">
          Use this guide to pick the right activities by location, comfort level, and budget — then submit your
          requirements and we’ll reach out with the best-fit options.
        </p>
      </header>
 
      <section className="grid gap-4 md:grid-cols-2">
        {ACTIVITY_SECTIONS.map((section) => (
          <article key={section.title} className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{section.body}</p>
          </article>
        ))}
      </section>
 
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Location Hotspots at a Glance</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Key Activities</th>
              </tr>
            </thead>
            <tbody>
              {HOTSPOTS.map((row) => (
                <tr key={row.location} className="border-t">
                  <td className="px-4 py-3 font-medium">{row.location}</td>
                  <td className="px-4 py-3 text-slate-600">{row.activities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
 
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Get a Quote / Create a Lead</h2>
        <p className="mt-1 text-slate-600">
          Share your plan (dates, group size, location, and activities). We’ll recommend the best operators and slots.
        </p>
        <div className="mt-5">
          <LeadForm availableActivities={KNOWN_ACTIVITY_NAMES} submitLabel="Submit Lead" />
        </div>
      </section>
    </div>
  );
};
