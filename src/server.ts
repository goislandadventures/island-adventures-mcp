import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

interface Env {
  ASSETS: Fetcher;
}

const BOOKING_CARD_URI =
  "ui://island-adventures/booking-card-v3.html";

const OPENAI_CHALLENGE_PATH =
  "/.well-known/openai-apps-challenge";

const OPENAI_CHALLENGE_TOKEN =
  "qjNyani4CQnrkSb8T2te-moSBrLOFnE6tnZaEBysCb0";

const activitySchema = z.enum([
  "snorkel",
  "sandbar",
  "sunset",
  "custom",
  "mixed",
  "unsure",
  "group",
]);

const optionSchema = z.object({
  duration: z.string(),
  price: z.number(),
  pricePrefix: z.string().optional(),
  label: z.string(),
});

const tripSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  maxGuests: z.number(),
  location: z.string(),
  bookingUrl: z.string(),
  startingPrice: z.number(),
  priceNote: z.string(),
  options: z.array(optionSchema),
  highlights: z.array(z.string()),
  guestCount: z.number().optional(),
  recommendation: z.string(),
});

const trips = {
  snorkel: {
    key: "snorkel",
    name: "Private Snorkeling Charter",
    description:
      "A relaxed private snorkeling day in Islamorada with your own boat and captain. Snorkel gear is included, and your captain chooses the best available location based on weather, water conditions, visibility, and safety.",
    maxGuests: 6,
    location: "Angler House Marina · Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5818?from=googlewebleads",
    startingPrice: 399,
    priceNote:
      "Published charter pricing for 1–6 guests. Check WaveRez for live date and time availability.",
    options: [
      {
        duration: "2 hours",
        price: 399,
        label: "Perfect for a quick private reef adventure.",
      },
      {
        duration: "3 hours",
        price: 519,
        label: "More time to explore and enjoy the water.",
      },
      {
        duration: "4 hours",
        price: 649,
        label: "Snorkeling plus extra time for a fuller private boat day.",
      },
    ],
    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Snorkel gear included",
      "Up to 6 guests",
    ],
  },

  sandbar: {
    key: "sandbar",
    name: "Private Sandbar Charter",
    description:
      "An easy private trip to the Islamorada Sandbar for your group to swim, float, relax, listen to music, and enjoy shallow Florida Keys water without joining a crowded party boat.",
    maxGuests: 6,
    location: "Angler House Marina · Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5819?from=googlewebleads",
    startingPrice: 359,
    priceNote:
      "Current WaveRez listing starts at $359 and offers 2, 3, and 4-hour options. Check WaveRez for the live price for the duration you choose.",
    options: [
      {
        duration: "2–4 hours",
        price: 359,
        pricePrefix: "From",
        label: "Choose a 2, 3, or 4-hour private sandbar charter in WaveRez.",
      },
    ],
    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Shallow-water fun",
      "Up to 6 guests",
    ],
  },

  sunset: {
    key: "sunset",
    name: "Private Sunset Cruise",
    description:
      "A private evening on Florida Bay for your group, with your own boat and captain instead of a crowded sightseeing cruise.",
    maxGuests: 6,
    location: "Angler House Marina · Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5820?from=googlewebleads",
    startingPrice: 479,
    priceNote:
      "Current WaveRez listing starts at $479. Check WaveRez for live date, time, and final checkout pricing.",
    options: [
      {
        duration: "2 hours",
        price: 479,
        pricePrefix: "From",
        label: "Private Florida Bay sunset experience; live options are shown in WaveRez.",
      },
    ],
    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Florida Bay sunset",
      "Up to 6 guests",
    ],
  },

  custom: {
    key: "custom",
    name: "Private Custom Boat Charter",
    description:
      "A flexible private Islamorada boat day built around your group. Snorkel, visit the sandbar, cruise, sightsee, bar-hop, or combine activities while your captain helps shape the best plan for the conditions.",
    maxGuests: 6,
    location: "Angler House Marina · Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5821?from=googlewebleads",
    startingPrice: 579,
    priceNote:
      "Current WaveRez listing starts at $579 for 2–4 hour options. Check WaveRez for the live price for the duration you choose.",
    options: [
      {
        duration: "2–4 hours",
        price: 579,
        pricePrefix: "From",
        label: "Build the day around what your group wants most.",
      },
    ],
    highlights: [
      "Your own private boat",
      "Flexible itinerary",
      "Licensed captain included",
      "Up to 6 guests",
    ],
  },

  group: {
    key: "group",
    name: "Private Large Group Charter",
    description:
      "A coordinated private four-hour experience for 7–12 guests using two boats and two captains. Your group stays together while keeping the private-charter experience.",
    maxGuests: 12,
    location: "Angler House Marina · Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5822?from=googlewebleads",
    startingPrice: 1279,
    priceNote:
      "Current WaveRez listing starts at $1,279 for the 4-hour large-group charter. Check WaveRez for live date and departure availability.",
    options: [
      {
        duration: "4 hours",
        price: 1279,
        pricePrefix: "From",
        label: "Two boats and two captains for 7–12 guests.",
      },
    ],
    highlights: [
      "Two private boats",
      "Two licensed captains",
      "4-hour experience",
      "7–12 guests",
    ],
  },
} as const;

type TripKey = keyof typeof trips;
type Activity = z.infer<typeof activitySchema>;

function canonicalTripForActivity(activity?: Activity): TripKey {
  if (activity === "mixed" || activity === "unsure") {
    return "custom";
  }

  if (!activity) {
    return "custom";
  }

  return activity as TripKey;
}

function activityPhrase(activity?: Activity) {
  switch (activity) {
    case "snorkel":
      return "snorkeling";
    case "sandbar":
      return "the sandbar";
    case "sunset":
      return "sunset";
    case "mixed":
      return "a mix of activities";
    case "unsure":
      return "a flexible boat day";
    case "custom":
      return "a custom day";
    case "group":
      return "a private group day";
    default:
      return "a private charter";
  }
}

function buildRecommendation(
  tripKey: TripKey,
  guests?: number,
  requestedActivity?: Activity
) {
  if (tripKey === "group") {
    const goal = activityPhrase(requestedActivity);

    return guests
      ? `Your group has ${guests} guests and wants ${goal}. Because one Island Adventures boat carries up to 6 guests, the correct private setup is the 4-hour large-group charter with two boats and two captains.`
      : "For 7–12 guests, the correct private setup is the 4-hour large-group charter with two boats and two captains.";
  }

  switch (tripKey) {
    case "snorkel":
      return guests
        ? `You’re a group of ${guests} and snorkeling is the priority, so this gives you your own private boat and captain without paying for a larger two-boat setup.`
        : "Snorkeling is the priority, so this gives your group its own private boat and captain instead of joining a shared tour.";

    case "sandbar":
      return guests
        ? `You’re a group of ${guests} and the sandbar is the main goal, so this keeps the day simple: your own private boat, your own captain, and no shared-tour crowd.`
        : "The sandbar is the main goal, so this keeps the day simple with your own private boat and captain.";

    case "sunset":
      return guests
        ? `You’re a group of ${guests} and sunset is the main event, so this gives you a relaxed private evening without the crowd of a public cruise.`
        : "Sunset is the main event, so this gives your group a relaxed private evening without a public-tour crowd.";

    case "custom":
      return guests
        ? `You’re a group of ${guests} and want flexibility rather than one fixed activity, so your captain can shape the day around what your group actually wants to do.`
        : "You want flexibility rather than one fixed activity, so your captain can shape the day around your group.";
  }
}

function formatPrice(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function buildPlainText(trip: {
  name: string;
  recommendation: string;
  description: string;
  options: readonly {
    duration: string;
    price: number;
    pricePrefix?: string;
  }[];
  priceNote: string;
  location: string;
  bookingUrl: string;
}) {
  const pricing = trip.options
    .map((option) => {
      const prefix = option.pricePrefix
        ? `${option.pricePrefix} `
        : "";

      return `• ${option.duration}: ${prefix}${formatPrice(option.price)}`;
    })
    .join("\n");

  return (
    `${trip.name}\n\n` +
    `Why this fits: ${trip.recommendation}\n\n` +
    `${trip.description}\n\n` +
    `Pricing:\n${pricing}\n` +
    `${trip.priceNote}\n\n` +
    `Departure: ${trip.location}\n\n` +
    `Check Private Charter Availability:\n${trip.bookingUrl}`
  );
}

function createServer(env: Env) {
  const server = new McpServer(
    {
      name: "Island Adventures Reservations",
      version: "2.3.0",
    },
    {
      instructions:
        "Island Adventures is a private charter operator in Islamorada, Florida Keys. " +
        "Use find_trip when the user wants help choosing or checking availability for an Island Adventures snorkeling, sandbar, sunset, custom, or 7–12 guest private charter. " +
        "The find_trip tool is intentionally self-contained: call it once and use its returned recommendation, pricing, booking link, and rendered card. " +
        "Do not call a second Island Adventures tool after find_trip. " +
        "Map mixed activities to activity=mixed and uncertainty about which charter to choose to activity=unsure. " +
        "Groups of 7 through 12 always use the large-group charter regardless of requested activity. " +
        "Do not use this app for fishing-only charters, boat rentals, hotels, restaurants, lodging, transportation, or unrelated Islamorada requests. " +
        "For groups larger than 12, explain that this app supports up to 12 guests and do not invent a larger product. " +
        "The preferred customer call to action is 'Check Private Charter Availability'.",
    }
  );

  registerAppResource(
    server,
    "Island Adventures Booking Card",
    BOOKING_CARD_URI,
    {
      description:
        "Interactive Island Adventures private charter recommendation and availability card.",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async () => {
      const response = await env.ASSETS.fetch(
        new Request(
          "https://island-adventures-assets.local/booking-card.html"
        )
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load booking-card.html: ${response.status}`
        );
      }

      const html = await response.text();

      return {
        contents: [
          {
            uri: BOOKING_CARD_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                prefersBorder: true,
                csp: {
                  connectDomains: [],
                  resourceDomains: [],
                },
              },
              "openai/widgetDescription":
                "Island Adventures private charter recommendation and availability card.",
              "openai/widgetPrefersBorder": true,
              "openai/widgetCSP": {
                connect_domains: [],
                resource_domains: [],
                redirect_domains: [
                  "https://reservations.waverez.com",
                ],
              },
            },
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "find_trip",
    {
      title: "Find the best Island Adventures charter",
      description:
        "Find and display the single best Island Adventures private charter for a customer visiting Islamorada. " +
        "Use for private snorkeling, Islamorada Sandbar trips, private sunset cruises, mixed/custom boat days, customers who are unsure what to book, and private groups of 7–12. " +
        "For 7–12 guests, always use this tool and pass the guest count; the server automatically selects the two-boat large-group charter. " +
        "For a request combining activities such as snorkeling plus sandbar, pass activity=mixed. " +
        "If the customer does not know which charter to choose, pass activity=unsure. " +
        "Do NOT use this tool for fishing-only charters, boat rentals, hotels, restaurants, lodging, transportation, or unrelated local recommendations. " +
        "Do NOT use it for groups larger than 12. " +
        "This one tool returns the full recommendation, pricing, direct WaveRez availability URL, and interactive booking card; no follow-up Island Adventures tool call is needed.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        activity: activitySchema
          .optional()
          .describe(
            "Customer intent. Use snorkel for snorkeling-first requests; sandbar for sandbar-first; sunset for sunset-first; mixed for two or more activities; unsure when the customer wants help choosing; custom when they explicitly ask for a custom/flexible charter; group only when they explicitly ask for the large-group product."
          ),
        guests: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe(
            "Total number of guests. Pass the known count from the conversation. Groups of 7–12 are automatically routed to the large-group charter."
          ),
      },
      outputSchema: {
        trip: tripSchema,
      },
      _meta: {
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },
        "openai/outputTemplate": BOOKING_CARD_URI,
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking":
          "Finding your best private charter…",
        "openai/toolInvocation/invoked":
          "Your Island Adventures recommendation is ready.",
      },
    },
    async ({ activity, guests }) => {
      let selected = canonicalTripForActivity(activity);

      if (guests && guests > 6) {
        selected = "group";
      }

      const baseTrip = trips[selected];
      const trip = {
        ...baseTrip,
        guestCount: guests,
        recommendation: buildRecommendation(
          selected,
          guests,
          activity
        ),
      };

      return {
        structuredContent: {
          trip,
        },
        content: [
          {
            type: "text",
            text: buildPlainText(trip),
          },
        ],
      };
    }
  );

  return server;
}

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ) {
    const url = new URL(request.url);

    if (url.pathname === OPENAI_CHALLENGE_PATH) {
      return new Response(OPENAI_CHALLENGE_TOKEN, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return createMcpHandler(
      () => createServer(env)
    )(
      request,
      env,
      ctx
    );
  },
} satisfies ExportedHandler<Env>;
