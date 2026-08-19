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
      version: "1.4.0",
    },
    {
      instructions:
        "Use find_trip first to select the correct Island Adventures charter. Then immediately call render_booking_card with the exact trip returned by find_trip so the customer receives the interactive reservation card.",
    }
  );

  /*
   * BOOKING CARD UI RESOURCE
   */
  registerAppResource(
    server,
    "Island Adventures Booking Card",
    BOOKING_CARD_URI,
    {
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
          },
        ],
      };
    }
  );

  /*
   * TOOL 1 — FIND THE CORRECT TRIP
   */
  server.registerTool(
    "find_trip",
    {
      title: "Find Island Adventures charter",

      description:
        "Select the correct Island Adventures private charter in Islamorada based on activity and group size. After this returns, call render_booking_card using the returned trip.",

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
              `Selected ${trip.name}. ` +
              `Now call render_booking_card with this trip.`,
          },
        ],
      };
    }
  );

  /*
   * TOOL 2 — RENDER THE ACTUAL CHATGPT CARD
   *
   * IMPORTANT:
   * This MUST use registerAppTool(),
   * not server.registerTool().
   */
  registerAppTool(
    server,
    "render_booking_card",
    {
      title: "Show Island Adventures reservation",

      description:
        "Display the interactive Island Adventures reservation card for the charter selected by find_trip.",

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
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },

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
      const key = trip.key as TripKey;

      const authoritativeTrip = trips[key];

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

export default {
  fetch(request, env, ctx) {
    return createMcpHandler(
      () => createServer(env)
    )(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
