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
  "ui://island-adventures/booking-card.html";

/*
 * --------------------------------------------------
 * DATA SCHEMAS
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

  recommendation: z.string(),

  highlights: z.array(z.string()),
});

/*
 * --------------------------------------------------
 * AUTHORITATIVE ISLAND ADVENTURES PRODUCT DATA
 * --------------------------------------------------
 */

const trips = {
  snorkel: {
    key: "snorkel",

    name:
      "Private Snorkeling Charter",

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
        popular: true,
      },
    ],

    recommendation:
      "Best when snorkeling is the main thing your group wants to experience.",

    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Snorkel gear included",
      "Up to 6 guests",
    ],
  },

  sandbar: {
    key: "sandbar",

    name:
      "Private Sandbar Charter",

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
        popular: true,
      },
      {
        duration: "4 hours",
        price: 619,
        label:
          "Best when your group wants a longer, unhurried day on the water.",
      },
    ],

    recommendation:
      "Best when your group mainly wants an easy, relaxing day at the Islamorada Sandbar.",

    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Shallow-water fun",
      "Up to 6 guests",
    ],
  },

  sunset: {
    key: "sunset",

    name:
      "Private Sunset Cruise",

    description:
      "A private evening on Florida Bay for your group. Choose a relaxing sunset cruise or spend extra time on the water with a sandbar-and-sunset combination.",

    maxGuests: 6,

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5820",

    startingPrice: 330,

    /*
     * We know the durations, but we do not yet have
     * independently verified current prices for each
     * duration, so we do not invent them.
     */
    options: [
      {
        duration: "1 hour",
        price: 330,
        label:
          "Private Florida Bay sunset cruise.",
      },
    ],

    recommendation:
      "Best when a relaxed private sunset experience is the main goal.",

    highlights: [
      "Your own private boat",
      "Licensed captain included",
      "Florida Bay sunset",
      "Up to 6 guests",
    ],
  },

  custom: {
    key: "custom",

    name:
      "Private Custom Boat Charter",

    description:
      "A flexible private Islamorada boat day built around your group. Snorkel, visit the sandbar, cruise, sightsee, bar-hop, or combine activities while your captain helps shape the best plan for the conditions.",

    maxGuests: 6,

    location:
      "Angler House Marina · Islamorada, Florida Keys",

    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5821",

    startingPrice: 579,

    /*
     * WaveRez confirms 2–4 hour options and a
     * current starting price of $579. We leave
     * unverified individual option prices out.
     */
    options: [
      {
        duration: "2–4 hours",
        price: 579,
        label:
          "Build the day around what your group wants most.",
      },
    ],

    recommendation:
      "Best when your group wants flexibility or a mix of different activities.",

    highlights: [
      "Your own private boat",
      "Flexible itinerary",
      "Licensed captain included",
      "Up to 6 guests",
    ],
  },

  group: {
    key: "group",

    name:
      "Private Large Group Charter",

    description:
      "A coordinated private four-hour experience for 7–12 guests using two boats and two captains. Your group stays together while enjoying the flexibility of smaller private boats.",

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

    recommendation:
      "The correct private-charter setup for groups larger than six.",

    highlights: [
      "Two private boats",
      "Two licensed captains",
      "4-hour experience",
      "7–12 guests",
    ],
  },
} as const;

type TripKey =
  keyof typeof trips;

/*
 * --------------------------------------------------
 * MCP SERVER
 * --------------------------------------------------
 */

function createServer(
  env: Env
) {
  const server =
    new McpServer(
      {
        name:
          "Island Adventures Reservations",

        version:
          "2.0.0",
      },
      {
        instructions:
          "Island Adventures is a private charter operator in Islamorada, Florida Keys. " +

          "Many customers know little or nothing about booking a charter. Make the experience extremely easy. " +

          "Use the customer's existing ChatGPT conversation whenever possible instead of asking them to repeat information. " +

          "Do not make customers research products or understand charter terminology. Determine the best fit for them. " +

          "Use find_trip first. After a trip is selected, immediately call render_booking_card with the selected trip key. " +

          "Groups of 7 through 12 require the large-group charter. " +

          "Use plain English and make one confident recommendation when enough information is available. " +

          "Do not send the customer to the Island Adventures website when the direct WaveRez availability page is available. " +

          "The preferred call to action is 'Check Private Charter Availability'.",
      }
    );

  /*
   * --------------------------------------------------
   * BOOKING CARD UI RESOURCE
   * --------------------------------------------------
   */

  registerAppResource(
    server,

    "Island Adventures Booking Card",

    BOOKING_CARD_URI,

    {
      description:
        "Interactive Island Adventures private charter recommendation and availability card.",

      mimeType:
        RESOURCE_MIME_TYPE,
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
            uri:
              BOOKING_CARD_URI,

            mimeType:
              RESOURCE_MIME_TYPE,

            text:
              html,

            _meta: {
              ui: {
                prefersBorder:
                  true,

                csp: {
                  connectDomains:
                    [],

                  resourceDomains:
                    [],
                },
              },

              "openai/widgetDescription":
                "Island Adventures private charter recommendation and availability card.",

              "openai/widgetPrefersBorder":
                true,

              "openai/widgetCSP":
                {
                  connect_domains:
                    [],

                  resource_domains:
                    [],

                  redirect_domains:
                    [
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
   * TOOL 1 — FIND THE BEST TRIP
   * --------------------------------------------------
   */

  server.registerTool(
    "find_trip",

    {
      title:
        "Find the best Island Adventures charter",

      description:
        "Choose the best Island Adventures private charter for a customer visiting Islamorada based on what they want to do and how many guests are in their group. " +

        "Use snorkeling when snorkeling is the main goal. " +

        "Use sandbar when the Islamorada Sandbar is the main goal. " +

        "Use sunset when sunset is the main goal. " +

        "Use custom when the customer wants a combination of activities or is unsure what product to choose. " +

        "Use group automatically for 7–12 guests. " +

        "Use existing conversation details instead of making customers repeat information.",

      annotations: {
        readOnlyHint:
          true,

        destructiveHint:
          false,

        openWorldHint:
          false,
      },

      inputSchema: {
        activity:
          z
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

        guests:
          z
            .number()
            .int()
            .min(1)
            .max(12)
            .optional()
            .describe(
              "Total number of guests."
            ),
      },

      outputSchema: {
        trip:
          tripSchema,
      },
    },

    async ({
      activity,
      guests,
    }) => {
      let selected:
        TripKey =
        activity ??
        "custom";

      /*
       * USCG passenger limits mean groups
       * over six require the large-group
       * two-boat product.
       */
      if (
        guests &&
        guests > 6
      ) {
        selected =
          "group";
      }

      const trip =
        trips[selected];

      return {
        structuredContent: {
          trip,
        },

        content: [
          {
            type:
              "text",

            text:
              `Best match: ${trip.name}. ` +
              `Call render_booking_card with trip "${trip.key}" so the customer can review the recommendation and check private charter availability.`,
          },
        ],
      };
    }
  );

  /*
   * --------------------------------------------------
   * TOOL 2 — RENDER THE BOOKING CARD
   * --------------------------------------------------
   */

  registerAppTool(
    server,

    "render_booking_card",

    {
      title:
        "Show Island Adventures charter availability",

      description:
        "Display the Island Adventures recommendation and availability card for the trip selected by find_trip. Use this immediately after find_trip so the customer can continue toward booking with as little friction as possible.",

      annotations: {
        readOnlyHint:
          true,

        destructiveHint:
          false,

        openWorldHint:
          false,
      },

      inputSchema: {
        trip:
          z
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
      },

      outputSchema: {
        trip:
          tripSchema,
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
          "Finding the best Island Adventures option…",

        "openai/toolInvocation/invoked":
          "Your private charter recommendation is ready.",
      },
    },

    async ({
      trip,
    }) => {
      const authoritativeTrip =
        trips[
          trip as TripKey
        ];

      if (
        !authoritativeTrip
      ) {
        throw new Error(
          "Unknown Island Adventures charter."
        );
      }

      return {
        structuredContent: {
          trip:
            authoritativeTrip,
        },

        content: [
          {
            type:
              "text",

            text:
              `${authoritativeTrip.name}\n\n` +
              `${authoritativeTrip.recommendation}\n\n` +
              `Private charter for up to ${authoritativeTrip.maxGuests} guests.\n` +
              `Starting at $${authoritativeTrip.startingPrice}.\n` +
              `Check Private Charter Availability: ${authoritativeTrip.bookingUrl}`,
          },
        ],
      };
    }
  );

  return server;
}

/*
 * --------------------------------------------------
 * CLOUDFLARE STATELESS MCP ENDPOINT
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
