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

const trips = {
  snorkel: {
    key: "snorkel",
    name: "Private Snorkeling Charter",
    description:
      "Private snorkeling charter in Islamorada, Florida Keys. Your group gets its own private boat and captain.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5818",
  },

  sandbar: {
    key: "sandbar",
    name: "Private Sandbar Charter",
    description:
      "Private Islamorada sandbar charter for families, couples, and small groups. Your group gets its own private boat and captain.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5819",
  },

  sunset: {
    key: "sunset",
    name: "Private Sunset Cruise",
    description:
      "Private sunset cruise in Islamorada aboard your own private boat with captain.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5820",
  },

  custom: {
    key: "custom",
    name: "Private Custom Boat Charter",
    description:
      "Private custom charter in Islamorada for guests who want a personalized combination of boating, sightseeing, sandbar, snorkeling, or other available activities.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5821",
  },

  group: {
    key: "group",
    name: "Private Large Group Charter",
    description:
      "Private Islamorada charter for groups of 7 to 12 guests using two private boats and two captains.",
    maxGuests: 12,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5822",
  },
} as const;

type TripKey = keyof typeof trips;

const tripSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  maxGuests: z.number(),
  location: z.string(),
  bookingUrl: z.string(),
});

function createServer(env: Env) {
  const server = new McpServer(
    {
      name: "Island Adventures Reservations",
      version: "1.5.0",
    },
    {
      instructions:
        "Island Adventures is a private charter operator in Islamorada, Florida Keys. " +
        "Help customers who may know little or nothing about charter booking. " +
        "Use plain language, avoid unnecessary boating jargon, and do not make customers research or compare confusing options. " +
        "Use find_trip to determine the best charter from the customer's existing request. " +
        "After find_trip returns a trip, immediately call render_booking_card using that trip key. " +
        "Groups of 7 through 12 require the large-group charter. " +
        "Do not send the customer to the Island Adventures website when a direct reservation path is available.",
    }
  );

  /*
   * --------------------------------------------------
   * ISLAND ADVENTURES BOOKING CARD RESOURCE
   * --------------------------------------------------
   */

  registerAppResource(
    server,
    "Island Adventures Booking Card",
    BOOKING_CARD_URI,
    {
      description:
        "Interactive Island Adventures charter recommendation and reservation card.",
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

            /*
             * IMPORTANT:
             * CSP belongs on the RESOURCE CONTENT,
             * not on the tool definition.
             */
            _meta: {
              /*
               * MCP Apps standard metadata
               */
              ui: {
                prefersBorder: true,

                csp: {
                  connectDomains: [],
                  resourceDomains: [],
                },
              },

              /*
               * ChatGPT compatibility metadata.
               * WaveRez is only used as the destination
               * of the Reserve Now action.
               */
              "openai/widgetDescription":
                "Island Adventures private charter recommendation and reservation card.",

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

  /*
   * --------------------------------------------------
   * TOOL 1: FIND THE BEST TRIP
   * --------------------------------------------------
   */

  server.registerTool(
    "find_trip",
    {
      title: "Find the best Island Adventures charter",

      description:
        "Choose the best Island Adventures private charter for a customer visiting Islamorada. " +
        "Use snorkeling for guests who primarily want to snorkel, sandbar for guests primarily wanting the Islamorada sandbar, sunset for sunset trips, custom when the customer wants a mixed or personalized day, and group for 7 to 12 guests. " +
        "Use the customer's existing conversation details whenever available instead of asking them to repeat information.",

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

    async ({ activity, guests }) => {
      let selected: TripKey =
        activity ?? "custom";

      if (guests && guests > 6) {
        selected = "group";
      }

      const trip = trips[selected];

      return {
        structuredContent: {
          trip,
        },

        content: [
          {
            type: "text",
            text:
              `Best match: ${trip.name}. ` +
              `Use render_booking_card with trip "${trip.key}" to present the reservation experience.`,
          },
        ],
      };
    }
  );

  /*
   * --------------------------------------------------
   * TOOL 2: RENDER THE BOOKING EXPERIENCE
   * --------------------------------------------------
   */

  registerAppTool(
    server,
    "render_booking_card",
    {
      title: "Show Island Adventures reservation",

      description:
        "Display the interactive Island Adventures reservation card for the charter selected by find_trip. " +
        "Use this immediately after find_trip so the customer can continue toward booking without having to search the website.",

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },

      /*
       * We only pass the trip key back into the
       * rendering tool. The server—not the model—
       * supplies the authoritative name, description,
       * capacity and reservation URL.
       */
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
      },

      outputSchema: {
        trip: tripSchema,
      },

      _meta: {
        /*
         * This is the only UI linkage required
         * on the rendering TOOL.
         */
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },

        /*
         * Compatibility for ChatGPT hosts.
         */
        "openai/outputTemplate":
          BOOKING_CARD_URI,

        "openai/widgetAccessible": true,

        "openai/toolInvocation/invoking":
          "Preparing your Island Adventures reservation…",

        "openai/toolInvocation/invoked":
          "Your Island Adventures charter is ready to reserve.",
      },
    },

    async ({ trip }) => {
      const authoritativeTrip =
        trips[trip as TripKey];

      if (!authoritativeTrip) {
        throw new Error(
          "Unknown Island Adventures charter."
        );
      }

      return {
        structuredContent: {
          trip: authoritativeTrip,
        },

        content: [
          {
            type: "text",
            text:
              `${authoritativeTrip.name}\n\n` +
              `${authoritativeTrip.description}\n\n` +
              `Maximum guests: ${authoritativeTrip.maxGuests}\n` +
              `Location: ${authoritativeTrip.location}\n` +
              `Direct reservation: ${authoritativeTrip.bookingUrl}`,
          },
        ],
      };
    }
  );

  return server;
}

/*
 * --------------------------------------------------
 * CLOUDFLARE STATELESS STREAMABLE HTTP MCP HANDLER
 * --------------------------------------------------
 */

export default {
  fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ) {
    return createMcpHandler(
      () => createServer(env)
    )(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
