import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

interface Env {
  ASSETS: Fetcher;
}

const BOOKING_CARD_URI =
  "ui://island-adventures/booking-card-v3.html";

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
      version: "1.3.0",
    },
    {
      instructions:
        "Use find_trip to determine the correct Island Adventures charter. After find_trip returns a trip, immediately call render_booking_card with that exact trip data so the customer receives the interactive reservation card. Do not substitute another booking source.",
    }
  );

  /*
   * ------------------------------------------------------
   * MCP APP UI RESOURCE
   * ------------------------------------------------------
   */

  registerAppResource(
    server,
    "island-adventures-booking-card",
    BOOKING_CARD_URI,
    {},
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
                "Island Adventures private charter reservation card.",

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
   * ------------------------------------------------------
   * TOOL 1 — CHOOSE THE CORRECT TRIP
   * ------------------------------------------------------
   *
   * No UI is attached to this tool.
   * It only determines the authoritative trip.
   */

  server.registerTool(
    "find_trip",
    {
      title: "Find the best Island Adventures charter",

      description:
        "Determine the correct Island Adventures private charter in Islamorada based on activity and group size. Use this first. After receiving the result, call render_booking_card with the returned trip data.",

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
          .optional(),

        guests: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional(),
      },

      outputSchema: {
        trip: tripSchema,
      },
    },

    async ({ activity, guests }) => {
      let selected: TripKey = activity ?? "custom";

      /*
       * Groups over six require the two-boat
       * large-group product.
       */
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
              `Selected trip: ${trip.name}. ` +
              `Maximum ${trip.maxGuests} guests. ` +
              `Next call render_booking_card using this exact trip data.`,
          },
        ],
      };
    }
  );

  /*
   * ------------------------------------------------------
   * TOOL 2 — RENDER THE RESERVATION CARD
   * ------------------------------------------------------
   *
   * This is the ONLY tool attached to the UI.
   */

  server.registerTool(
    "render_booking_card",
    {
      title: "Show Island Adventures reservation card",

      description:
        "Render the interactive Island Adventures reservation card for a trip already selected by find_trip. Use the exact trip information returned by find_trip.",

      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },

      inputSchema: {
        trip: tripSchema,
      },

      outputSchema: {
        trip: tripSchema,
      },

      _meta: {
        /*
         * MCP Apps standard
         */
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },

        /*
         * ChatGPT compatibility alias
         */
        "openai/outputTemplate":
          BOOKING_CARD_URI,

        /*
         * Allow the component to participate
         * as an MCP App.
         */
        "openai/widgetAccessible": true,

        "openai/toolInvocation/invoking":
          "Preparing your Island Adventures reservation…",

        "openai/toolInvocation/invoked":
          "Your Island Adventures charter is ready to reserve.",
      },
    },

    async ({ trip }) => {
      /*
       * Do not trust arbitrary URLs supplied by the model.
       * Re-resolve the trip from our own server catalog.
       */

      const key = trip.key as TripKey;
      const authoritativeTrip = trips[key];

      if (!authoritativeTrip) {
        throw new Error(
          "Unknown Island Adventures trip."
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
 * ------------------------------------------------------
 * CLOUDFLARE STREAMABLE HTTP MCP ENDPOINT
 * ------------------------------------------------------
 */

export default {
  fetch(request, env, ctx) {
    return createMcpHandler(
      () => createServer(env)
    )(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
