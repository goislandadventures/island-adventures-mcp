import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
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
      "Private Islamorada charter for groups of up to 12 guests using two private boats and two captains.",
    maxGuests: 12,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5822",
  },
} as const;

type TripKey = keyof typeof trips;

const tripOutputSchema = {
  trip: z.object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    maxGuests: z.number(),
    location: z.string(),
    bookingUrl: z.string(),
  }),
};

function createServer(env: Env) {
  const server = new McpServer({
    name: "Island Adventures Reservations",
    version: "1.2.0",
  });

  server.registerResource(
    "island-adventures-booking-card",
    BOOKING_CARD_URI,
    {},
    async () => {
      const response = await env.ASSETS.fetch(
        "https://island-adventures-assets.local/booking-card.html"
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
            mimeType: "text/html;profile=mcp-app",
            text: html,
            _meta: {
              ui: {
                prefersBorder: true,
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

  server.registerTool(
    "find_trip",
    {
      title: "Find and reserve an Island Adventures charter",

      description:
        "Find the best Island Adventures private charter in Islamorada and present a direct reservation card. Use for snorkeling, sandbar, sunset, custom trips, or groups up to 12. Groups of 7 to 12 require the large-group charter.",

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

      outputSchema: tripOutputSchema,

      _meta: {
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },

        "openai/outputTemplate": BOOKING_CARD_URI,

        "openai/toolInvocation/invoking":
          "Finding the best Island Adventures charter…",

        "openai/toolInvocation/invoked":
          "Your Island Adventures charter is ready.",
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
              `${trip.name}\n\n` +
              `${trip.description}\n\n` +
              `Maximum guests: ${trip.maxGuests}\n` +
              `Location: ${trip.location}\n` +
              `Direct reservation: ${trip.bookingUrl}`,
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
