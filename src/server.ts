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
  "ui://island-adventures/booking-card-v2.html";

/*
 * --------------------------------------------------
 * SCHEMAS
 * --------------------------------------------------
 */

const optionSchema = z.object({
  duration: z.string(),
  price: z.number(),
  label: z.string(),
  popular: z.boolean().optional(),
});

const tripSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  maxGuests: z.number(),
  location: z.string(),
  bookingUrl: z.string(),

  startingPrice: z.number().optional(),
  options: z.array(optionSchema),
  highlights: z.array(z.string()),

  guestCount: z.number().optional(),
  recommendation: z.string(),
});

/*
 * --------------------------------------------------
 * AUTHORITATIVE ISLAND ADVENTURES DATA
 * --------------------------------------------------
 */

const trips = {
  snorkel: {
    key: "snorkel",
    name: "Private Snorkeling Charter",

    description:
      "A relaxed private snorkeling day in Islamorada with your own boat and captain. Snorkel gear is included, and your captain chooses the best available location based on weather, water conditions, visibility, and safety.",

    maxGuests: 6,

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5818",

    startingPrice: 399,

    options: [
      {
        duration: "2 hours",
        price: 399,
        label:
          "Perfect for a quick private reef adventure.",
      },
      {
        duration: "3 hours",
        price: 519,
        label:
          "More time to explore and enjoy the water.",
      },
      {
        duration: "4 hours",
        price: 649,
        label:
          "Snorkeling plus extra time for a fuller private boat day.",
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

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5819",

    startingPrice: 379,

    options: [
      {
        duration: "2 hours",
        price: 379,
        label:
          "A quick private sandbar escape.",
      },
      {
        duration: "3 hours",
        price: 489,
        label:
          "Plenty of time to settle in and relax.",
      },
      {
        duration: "4 hours",
        price: 619,
        label:
          "Best when your group wants a longer, unhurried day on the water.",
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
      "A private evening on Florida Bay for your group. Enjoy the sunset from your own private boat instead of a crowded sightseeing cruise.",

    maxGuests: 6,

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5820",

    startingPrice: 330,

    options: [
      {
        duration: "1 hour",
        price: 330,
        label:
          "Private Florida Bay sunset cruise.",
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

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5821",

    startingPrice: 579,

    options: [
      {
        duration: "2–4 hours",
        price: 579,
        label:
          "Build the day around what your group wants most.",
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

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5822",

    startingPrice: 1279,

    options: [
      {
        duration: "4 hours",
        price: 1279,
        label:
          "Two boats and two captains for 7–12 guests.",
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

/*
 * --------------------------------------------------
 * PERSONALIZED RECOMMENDATION
 * --------------------------------------------------
 */

function buildRecommendation(
  tripKey: TripKey,
  guests?: number
) {
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
        ? `You’re a group of ${guests} and the sunset is the main event, so this gives you a relaxed private evening without the crowd of a public cruise.`
        : "The sunset is the main event, so this gives your group a relaxed private evening without a public-tour crowd.";

    case "custom":
      return guests
        ? `You’re a group of ${guests} and want flexibility rather than one fixed activity, so your captain can shape the day around what your group actually wants to do.`
        : "You want flexibility rather than one fixed activity, so your captain can shape the day around your group.";

    case "group":
      return guests
        ? `Your group has ${guests} guests, which is more than one six-passenger boat can carry. This is the correct private setup: two boats and two captains so your group can stay together.`
        : "This is the correct private setup for 7–12 guests: two boats and two captains so your group can stay together.";
  }
}

/*
 * --------------------------------------------------
 * MCP SERVER
 * --------------------------------------------------
 */

function createServer(env: Env) {
  const server = new McpServer(
    {
      name: "Island Adventures Reservations",
      version: "2.2.0",
    },
    {
      instructions:
        "Island Adventures is a private charter operator in Islamorada, Florida Keys. " +
        "Many customers know little or nothing about booking a charter, so make the process exceptionally easy. " +
        "Use the customer's existing conversation context instead of asking them to repeat information. " +
        "Do not make customers research products or understand boating jargon. " +
        "Use find_trip first. Then immediately call render_booking_card with the selected trip key and guest count. " +
        "Groups of 7 through 12 always require the large-group charter. " +
        "Make one confident recommendation when enough information is available. " +
        "Do not send the customer to the Island Adventures website when a direct WaveRez availability page is available. " +
        "The preferred primary call to action is 'Check Private Charter Availability'. " +
        "Minimize clicks, choices, repeated questions, and unnecessary steps.",
    }
  );

  /*
   * --------------------------------------------------
   * BOOKING CARD RESOURCE
   * --------------------------------------------------
   */

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
      const response =
        await env.ASSETS.fetch(
          new Request(
            "https://island-adventures-assets.local/booking-card.html"
          )
        );

      if (!response.ok) {
        throw new Error(
          `Unable to load booking-card.html: ${response.status}`
        );
      }

      const html =
        await response.text();

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

              "openai/widgetPrefersBorder":
                true,

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

  /*
   * --------------------------------------------------
   * TOOL 1 — FIND BEST TRIP
   * --------------------------------------------------
   */

  server.registerTool(
    "find_trip",
    {
      title:
        "Find the best Island Adventures charter",

      description:
        "Choose the single best Island Adventures private charter for a customer visiting Islamorada based on what they want to do and how many guests are in their group. " +
        "Use snorkeling when snorkeling is the main goal. " +
        "Use sandbar when the Islamorada Sandbar is the main goal. " +
        "Use sunset when sunset is the main goal. " +
        "Use custom when the customer wants multiple activities, flexibility, or is unsure which charter to choose. " +
        "Use group automatically for 7–12 guests. " +
        "Use existing conversation details and do not ask the customer to repeat information unnecessarily.",

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },

      inputSchema: {
        activity: z
          .enum([
            "snorkel",
            "sandbar",
            "sunset",
            "custom",
            "group",
          ])
          .optional()
          .describe(
            "The customer's primary desired experience."
          ),

        guests: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe(
            "Total number of guests in the customer's group."
          ),
      },

      outputSchema: {
        trip: tripSchema,
      },
    },

    async ({
      activity,
      guests,
    }) => {
      let selected: TripKey =
        activity ?? "custom";

      /*
       * More than six passengers requires
       * Island Adventures' two-boat product.
       */
      if (
        guests &&
        guests > 6
      ) {
        selected = "group";
      }

      const baseTrip =
        trips[selected];

      const trip = {
        ...baseTrip,

        guestCount:
          guests,

        recommendation:
          buildRecommendation(
            selected,
            guests
          ),
      };

      return {
        structuredContent: {
          trip,
        },

        content: [
          {
            type: "text",

            text:
              `Selected ${trip.name}. ` +
              `Immediately call render_booking_card with trip "${trip.key}"` +
              (
                guests
                  ? ` and guests ${guests}.`
                  : "."
              ),
          },
        ],
      };
    }
  );

  /*
   * --------------------------------------------------
   * TOOL 2 — RENDER BOOKING CARD
   * --------------------------------------------------
   */

  registerAppTool(
    server,
    "render_booking_card",
    {
      title:
        "Show Island Adventures charter recommendation",

      description:
        "Render the Island Adventures recommendation selected by find_trip. " +
        "Always call find_trip first. " +
        "Pass the selected trip key and the customer's guest count whenever it is known from the conversation. " +
        "The card provides the primary customer-facing recommendation, pricing information, benefits, and availability action.",

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },

      inputSchema: {
        trip: z
          .enum([
            "snorkel",
            "sandbar",
            "sunset",
            "custom",
            "group",
          ])
          .describe(
            "The Island Adventures trip selected by find_trip."
          ),

        guests: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe(
            "The customer's group size from the existing conversation. Pass this whenever known."
          ),
      },

      outputSchema: {
        trip: tripSchema,
      },

      _meta: {
        ui: {
          resourceUri:
            BOOKING_CARD_URI,
        },

        "openai/outputTemplate":
          BOOKING_CARD_URI,

        "openai/widgetAccessible":
          true,

        "openai/toolInvocation/invoking":
          "Preparing your private charter recommendation…",

        "openai/toolInvocation/invoked":
          "Your Island Adventures recommendation is ready.",
      },
    },

    async ({
      trip,
      guests,
    }) => {
      const key =
        trip as TripKey;

      const baseTrip =
        trips[key];

      if (!baseTrip) {
        throw new Error(
          "Unknown Island Adventures charter."
        );
      }

      const authoritativeTrip = {
        ...baseTrip,

        guestCount:
          guests,

        recommendation:
          buildRecommendation(
            key,
            guests
          ),
      };

      return {
        structuredContent: {
          trip:
            authoritativeTrip,
        },

        /*
         * Deliberately short.
         * The UI card owns the buying experience.
         */
        content: [
          {
            type: "text",

            text:
              `${authoritativeTrip.name} is the best fit` +
              (
                guests
                  ? ` for your group of ${guests}.`
                  : "."
              ),
          },
        ],
      };
    }
  );

  return server;
}

/*
 * --------------------------------------------------
 * CLOUDFLARE STATELESS STREAMABLE HTTP MCP
 * --------------------------------------------------
 */

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ) {
    return createMcpHandler(
      () =>
        createServer(env)
    )(
      request,
      env,
      ctx
    );
  },
} satisfies ExportedHandler<Env>;
