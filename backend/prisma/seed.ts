import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/andamanbazaar?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ActivitySeed = {
  slug: string;
  title: string;
  description: string;
  location: string;
  types: string[];
  duration_minutes: number;
  price_min: number;
  price_max: number;
  age_min: number | null;
  images: string[];
  safety_notes: string;
};

const operatorSeeds = [
  {
    name: "North Bay Ocean Adventures",
    email: "northbay@andamanoperators.com",
    phone: "+91-9531900001",
    location: "North Bay",
  },
  {
    name: "Corbyn Wave Riders",
    email: "corbyn@andamanoperators.com",
    phone: "+91-9531900002",
    location: "Corbyn's Cove",
  },
  {
    name: "RG Water Sports Club",
    email: "rgwsc@andamanoperators.com",
    phone: "+91-9531900003",
    location: "Rajiv Gandhi Water Sports Complex",
  },
  {
    name: "Chidiyatapu Blue Trails",
    email: "chidiyatapu@andamanoperators.com",
    phone: "+91-9531900004",
    location: "Chidiyatapu",
  },
  {
    name: "Elephant Beach Dive Centre",
    email: "elephantbeach@andamanoperators.com",
    phone: "+91-9531900005",
    location: "Havelock Elephant Beach",
  },
  {
    name: "Bharatpur Marine Tours",
    email: "bharatpur@andamanoperators.com",
    phone: "+91-9531900006",
    location: "Neil Bharatpur",
  },
  {
    name: "Jolly Buoy Eco Expeditions",
    email: "jollybuoy@andamanoperators.com",
    phone: "+91-9531900007",
    location: "Jolly Buoy",
  },
];

const activitySeeds: ActivitySeed[] = [
  {
    slug: "scuba-diving-north-bay",
    title: "Scuba Diving",
    description:
      "Guided scuba dives for beginners and certified divers across rich coral gardens and vibrant marine life zones. Beginners can do a Discover Scuba Dive at North Bay Island, while certified divers head to Chidiyatapu for more advanced dives. Pricing starts at ₹4,500 for a single introductory dive.",
    location: "North Bay",
    types: ["Diving", "Adventure"],
    duration_minutes: 120,
    price_min: 4500,
    price_max: 10500,
    age_min: 12,
    images: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&auto=format&fit=crop",
    ],
    safety_notes: "PADI-certified instructor mandatory. Medical declaration required before dive.",
  },
  {
    slug: "sea-walking-north-bay",
    title: "Sea Walking",
    description:
      "Walk on the seabed at 10–12 feet depth with an oxygen helmet — no swimming skills needed. Suitable for ages 7 to 70. A guide accompanies you throughout this 20-minute underwater experience at North Bay Island.",
    location: "North Bay",
    types: ["Underwater", "Family"],
    duration_minutes: 20,
    price_min: 3200,
    price_max: 5000,
    age_min: 7,
    images: [
      "https://images.unsplash.com/photo-1682687220777-2c60708d6889?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Pregnant guests and guests with severe respiratory conditions should avoid this activity.",
  },
  {
    slug: "snorkeling-elephant-beach",
    title: "Snorkeling",
    description:
      "Surface-level guided snorkeling in crystal-clear waters around colorful coral reefs, sea anemones, and diverse fish. Available at Elephant Beach, Havelock — one of the most accessible water activities.",
    location: "Havelock Elephant Beach",
    types: ["Reef", "Beginner"],
    duration_minutes: 60,
    price_min: 1200,
    price_max: 2500,
    age_min: 8,
    images: [
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Life jacket provided. Follow guide route and avoid touching corals.",
  },
  {
    slug: "parasailing-corbyn-cove",
    title: "Parasailing",
    description:
      "Soar above the turquoise waters harnessed in a parachute towed by a speedboat — fly like a kite above the sea at Corbyn's Cove. For ages 12–50. Not available for children under 12 or adults above 50.",
    location: "Corbyn's Cove",
    types: ["Aerial", "Thrill"],
    duration_minutes: 20,
    price_min: 2800,
    price_max: 4500,
    age_min: 12,
    images: [
      "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Weather dependent. Weight balance and harness checks are mandatory. Not available for guests above 50 years.",
  },
  {
    slug: "jet-skiing-rg-complex",
    title: "Jet Skiing",
    description:
      "High-speed jet ski rides at Rajiv Gandhi Water Sports Complex. A quick briefing session and life jacket are provided. A massive hit for those looking for an adrenaline rush on the Andaman waters.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Motorized", "Thrill"],
    duration_minutes: 15,
    price_min: 900,
    price_max: 1800,
    age_min: 10,
    images: [
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Life jacket compulsory. Follow instructor speed limits inside marked zone.",
  },
  {
    slug: "speed-boat-corbyn-cove",
    title: "Speed Boat Ride",
    description:
      "Fast-paced coastal speed boat rides operating from Andaman Water Sports Complex. No age limit — available to all tourists. Functions both as transport and a thrill, connecting Port Blair to Ross Island and North Bay Island.",
    location: "Corbyn's Cove",
    types: ["Motorized", "Sightseeing"],
    duration_minutes: 25,
    price_min: 1500,
    price_max: 3200,
    age_min: null,
    images: [
      "https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Seating instructions must be followed. Not recommended for severe back issues.",
  },
  {
    slug: "banana-boat-rg-complex",
    title: "Banana Boat Ride",
    description:
      "A banana-shaped inflatable boat tethered to a speedboat, accommodating up to 6 people at once. Ideal for families and friend groups — a group favourite at Rajiv Gandhi Water Sports Complex.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Group", "Fun"],
    duration_minutes: 20,
    price_min: 700,
    price_max: 1400,
    age_min: 7,
    images: [
      "https://images.unsplash.com/photo-1515375632430-5e10f3f7db31?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Life jacket and seated grip required at all times.",
  },
  {
    slug: "glass-bottom-boat-jolly-buoy",
    title: "Glass Bottom Boat",
    description:
      "Witness exotic marine life without getting wet through a transparent-bottom boat. Ideal for kids, elders, and anyone uncomfortable going underwater. Available at North Bay Island and Jolly Buoy.",
    location: "Jolly Buoy",
    types: ["Sightseeing", "Family"],
    duration_minutes: 40,
    price_min: 600,
    price_max: 1500,
    age_min: 3,
    images: [
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Remain seated while viewing. Avoid leaning over boat edges.",
  },
  {
    slug: "semi-submarine-north-bay",
    title: "Semi Submarine",
    description:
      "An immersive underwater view without any swimming or diving. The semi-submarine descends partially and offers panoramic views of coral reefs and marine life through its windows — great for all age groups.",
    location: "North Bay",
    types: ["Sightseeing", "Family"],
    duration_minutes: 60,
    price_min: 1800,
    price_max: 3200,
    age_min: 5,
    images: [
      "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Follow vessel safety briefing and emergency drill before boarding.",
  },
  {
    slug: "kayaking-chidiyatapu",
    title: "Kayaking",
    description:
      "Coastal kayaking through calm waters and scenic sunset points near Chidiyatapu shoreline. Suitable for all ages at a relaxed, self-paced experience.",
    location: "Chidiyatapu",
    types: ["Paddle", "Nature"],
    duration_minutes: 90,
    price_min: 1200,
    price_max: 2600,
    age_min: 10,
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Paddle briefing provided. Weather and tide conditions apply.",
  },
  {
    slug: "windsurfing-corbyn-cove",
    title: "Windsurfing",
    description:
      "Learn and practice windsurfing fundamentals with instructor guidance on moderate wind days at the Andaman Water Sports Complex. A classic skill-based water sport experience.",
    location: "Corbyn's Cove",
    types: ["Sailing", "Skill"],
    duration_minutes: 90,
    price_min: 2500,
    price_max: 4800,
    age_min: 14,
    images: [
      "https://images.unsplash.com/photo-1452440503154-d4592d2e9dde?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Basic balance fitness needed. Mandatory briefing before launch.",
  },
  {
    slug: "sea-karting-rg-complex",
    title: "Sea Karting",
    description:
      "An exciting, high-speed motorized kart on water — non-swimmers can enjoy too! A relatively newer offering that makes for a thrilling and unique experience at Rajiv Gandhi Water Sports Complex.",
    location: "Rajiv Gandhi Water Sports Complex",
    types: ["Motorized", "Premium"],
    duration_minutes: 40,
    price_min: 4200,
    price_max: 6800,
    age_min: 18,
    images: [
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Valid ID required. Operation allowed only after captain safety check.",
  },
  {
    slug: "sport-fishing-neil-bharatpur",
    title: "Sport Fishing",
    description:
      "Game fishing (angling) in the open sea with guided trips — popular among those who want a calmer, non-adrenaline experience while still being out on the water. Deep and nearshore catch-and-release trips.",
    location: "Neil Bharatpur",
    types: ["Fishing", "Premium"],
    duration_minutes: 240,
    price_min: 8000,
    price_max: 18000,
    age_min: 12,
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Sun protection and hydration advised. Follow crew handling instructions.",
  },
  {
    slug: "seaplane-port-blair",
    title: "Seaplane Ride",
    description:
      "A seaplane ride over the Andaman archipelago giving an aerial perspective of the islands, beaches, and turquoise lagoons. Positioned as a luxury premium adventure experience for high-end tourists.",
    location: "Port Blair",
    types: ["Aerial", "Sightseeing"],
    duration_minutes: 35,
    price_min: 3500,
    price_max: 9000,
    age_min: 2,
    images: [
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1575550959106-5a7defe28b56?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Flight schedule depends on weather and DGCA operating clearance.",
  },
  {
    slug: "harbour-cruise-port-blair",
    title: "Harbour Cruise",
    description:
      "Leisurely evening harbour or dinner cruise offering scenic views of Port Blair harbour with dining — a great experience for couples and families. Listed as a key tourism activity by Andaman Tourism.",
    location: "Port Blair",
    types: ["Cruise", "Leisure"],
    duration_minutes: 90,
    price_min: 900,
    price_max: 2200,
    age_min: 3,
    images: [
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Boarding closes 15 minutes before departure. Life vests onboard.",
  },
  {
    slug: "sup-neil-bharatpur",
    title: "Stand-Up Paddleboarding",
    description:
      "Stand-up paddleboarding on gentle lagoon waters at Bharatpur Beach with beginner coaching. A perfect blend of fitness and fun on the calm Andaman waters.",
    location: "Neil Bharatpur",
    types: ["Paddle", "Fitness"],
    duration_minutes: 60,
    price_min: 1100,
    price_max: 2400,
    age_min: 12,
    images: [
      "https://images.unsplash.com/photo-1509908759-dab69dc3d44f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Life jacket and leash required. Suitable for calm sea conditions only.",
  },
  {
    slug: "water-skiing-corbyn-cove",
    title: "Water Skiing",
    description:
      "Instructor-assisted water skiing sessions for adventure seekers at the Andaman Water Sports Complex. Stable tow speed control and full safety briefing included.",
    location: "Corbyn's Cove",
    types: ["Motorized", "Skill"],
    duration_minutes: 30,
    price_min: 2600,
    price_max: 5200,
    age_min: 16,
    images: [
      "https://images.unsplash.com/photo-1519666336592-e225a99dcd2f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Knee and back warm-up recommended. Safety helmet and vest mandatory.",
  },
  {
    slug: "mangrove-kayaking-havelock",
    title: "Mangrove Kayaking",
    description:
      "Guided kayaking through serene mangrove channels near Havelock with birdwatching and eco-interpretation. A tranquil eco-adventure with stunning scenic views through dense mangrove forests.",
    location: "Havelock Elephant Beach",
    types: ["Paddle", "Eco"],
    duration_minutes: 100,
    price_min: 1600,
    price_max: 3200,
    age_min: 10,
    images: [
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop",
    ],
    safety_notes: "Eco-sensitive zone: no littering and low-noise paddling strictly enforced.",
  },
];

const getOperatorByLocation = (
  operatorsByLocation: Map<string, { id: string; name: string }>,
  location: string,
) => {
  return operatorsByLocation.get(location) ?? operatorsByLocation.get("North Bay");
};

async function main(): Promise<void> {
  await prisma.activity.deleteMany();
  await prisma.operator.deleteMany();

  const operatorsByLocation = new Map<string, { id: string; name: string }>();

  for (const operatorSeed of operatorSeeds) {
    const operator = await prisma.operator.create({
      data: operatorSeed,
      select: {
        id: true,
        name: true,
      },
    });
    operatorsByLocation.set(operatorSeed.location, operator);
  }

  for (const activitySeed of activitySeeds) {
    const operator = getOperatorByLocation(operatorsByLocation, activitySeed.location);
    await prisma.activity.create({
      data: {
        ...activitySeed,
        operator: operator
          ? {
              connect: {
                id: operator.id,
              },
            }
          : undefined,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${operatorSeeds.length} operators and ${activitySeeds.length} activities successfully.`,
  );
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
