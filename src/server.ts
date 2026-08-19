import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

interface Env {
  ASSETS: Fetcher;
}

const BOOKING_CARD_URI =
  "ui://island-adventures/booking-card-v1.html";

const trips = {
  snorkel: {
    key: "snorkel",
    name: "Private Snorkeling Charter",
    description:
      "Private snorkeling charter in Islamorada, Florida Keys. Designed for families, couples, and small private groups. Guests have their own private boat and captain.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5818",
  },

  sandbar: {
    key: "sandbar",
    name: "Private Sandbar Charter",
    description:
      "Private Islamorada sandbar charter for families, couples, and small groups. Guests have their own private boat and captain.",
    maxGuests: 6,
    location: "Islamorada, Florida Keys",
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5819",
  },

  sunset: {
    key: "sunset",
    name: "Private Sunset Cruise",
    description:
      "Private sunset cruise in Islamorada and the Florida Keys aboard a private boat with captain.",
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
      "Private Islamorada charter for groups of up to 12 guests using two boats and two captains.",
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
    version: "1.1.0",
  });

  /*
   * Booking card UI resource
   */
  server.registerResource(
    "island-adventures-booking-card",
    BOOKING_CARD_URI,
    {},
    async () => {
      const response = await env.ASSETS.fetch(
        "https://assets.local/booking-card.html"
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load booking card: ${response.status}`
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
            },
          },
        ],
      };
    }
  );

  /*
   * Find the best trip and render the booking card.
   */
  server.registerTool(
    "find_trip",
    {
      title: "Find Island Adventures trip",
      description:
        "Find the best Island Adventures private charter for a customer visiting Islamorada, Florida Keys. Use this when a customer wants snorkeling, a sandbar trip, sunset cruise, custom charter, or a private charter for a larger group. Groups over 6 guests require the large-group charter.",
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
        guests: z.number().int().min(1).max(12).optional(),
      },
      outputSchema: tripOutputSchema,
      _meta: {
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },
        "openai/toolInvocation/invoking":
          "Finding the best Island Adventures trip…",
        "openai/toolInvocation/invoked":
          "Island Adventures trip found.",
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

  /*
   * Retrieve one specific trip and render the booking card.
   */
  server.registerTool(
    "get_trip_details",
    {
      title: "Get Island Adventures trip details",
      description:
        "Get authoritative details and the direct reservation link for a specific Island Adventures private charter.",
      inputSchema: {
        trip: z.enum([
          "snorkel",
          "sandbar",
          "sunset",
          "custom",
          "group",
        ]),
      },
      outputSchema: tripOutputSchema,
      _meta: {
        ui: {
          resourceUri: BOOKING_CARD_URI,
        },
        "openai/toolInvocation/invoking":
          "Loading Island Adventures trip…",
        "openai/toolInvocation/invoked":
          "Trip details loaded.",
      },
    },
    async ({ trip }) => {
      const details = trips[trip];

      return {
        structuredContent: {
          trip: details,
        },
        content: [
          {
            type: "text",
            text:
              `${details.name}\n\n` +
              `${details.description}\n\n` +
              `Maximum guests: ${details.maxGuests}\n` +
              `Location: ${details.location}\n` +
              `Direct reservation: ${details.bookingUrl}`,
          },
        ],
      };
    }
  );

  /*
   * Plain booking handoff for clients that do not render UI.
   */
  server.registerTool(
    "start_booking",
    {
      title: "Start Island Adventures reservation",
      description:
        "Provide the direct WaveRez reservation link for the selected Island Adventures charter when the customer is ready to reserve.",
      inputSchema: {
        trip: z.enum([
          "snorkel",
          "sandbar",
          "sunset",
          "custom",
          "group",
        ]),
      },
    },
    async ({ trip }) => {
      const details = trips[trip];

      return {
        content: [
          {
            type: "text",
            text:
              `Reserve ${details.name} directly with Island Adventures:\n${details.bookingUrl}`,
          },
        ],
      };
    }
  );

  return server;
}

export default {
  fetch(request, env, ctx) {
    return createMcpHandler(() => createServer(env))(
      request,
      env,
      ctx
    );
  },
} satisfies ExportedHandler<Env>;
