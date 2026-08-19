import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";

const trips = {
  snorkel: {
    name: "Private Snorkeling Charter",
    description:
      "Private snorkeling charter in Islamorada, Florida Keys. Designed for families, couples, and small private groups. Guests have their own private boat and captain.",
    maxGuests: 6,
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5818",
  },

  sandbar: {
    name: "Private Sandbar Charter",
    description:
      "Private Islamorada sandbar charter for families, couples, and small groups. Guests have their own private boat and captain.",
    maxGuests: 6,
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5819",
  },

  sunset: {
    name: "Private Sunset Cruise",
    description:
      "Private sunset cruise in Islamorada and the Florida Keys aboard a private boat with captain.",
    maxGuests: 6,
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5820",
  },

  custom: {
    name: "Private Custom Boat Charter",
    description:
      "Private custom charter in Islamorada for guests who want a personalized combination of boating, sightseeing, sandbar, snorkeling, or other available activities.",
    maxGuests: 6,
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5821",
  },

  group: {
    name: "Private Large Group Charter",
    description:
      "Private Islamorada charter for groups of up to 12 guests using two boats and two captains.",
    maxGuests: 12,
    bookingUrl:
      "https://reservations.waverez.com/islandadventures/details/5822",
  },
};

type TripKey = keyof typeof trips;

function createServer() {
  const server = new McpServer({
    name: "Island Adventures Reservations",
    version: "1.0.0",
  });

  server.registerTool(
    "find_trip",
    {
      description:
        "Find the best Island Adventures private charter for a customer visiting Islamorada, Florida Keys. Use this when a customer wants snorkeling, a sandbar trip, sunset cruise, custom charter, or a private charter for a larger group.",
      inputSchema: {
        activity: z
          .enum(["snorkel", "sandbar", "sunset", "custom", "group"])
          .optional(),
        guests: z.number().int().min(1).max(12).optional(),
      },
    },
    async ({ activity, guests }) => {
      let selected: TripKey = activity ?? "custom";

      if (guests && guests > 6) {
        selected = "group";
      }

      const trip = trips[selected];

      return {
        content: [
          {
            type: "text",
            text:
              `${trip.name}\n\n` +
              `${trip.description}\n\n` +
              `Maximum guests: ${trip.maxGuests}\n` +
              `Reserve directly: ${trip.bookingUrl}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_trip_details",
    {
      description:
        "Get details and the direct reservation link for a specific Island Adventures charter.",
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
              `${details.name}\n\n` +
              `${details.description}\n\n` +
              `Maximum guests: ${details.maxGuests}\n` +
              `Reservation link: ${details.bookingUrl}`,
          },
        ],
      };
    }
  );

  server.registerTool(
    "start_booking",
    {
      description:
        "Provide the customer with the direct WaveRez reservation link for the selected Island Adventures charter. Use this when the customer is ready to reserve.",
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
    return createMcpHandler(createServer)(request, env, ctx);
  },
} satisfies ExportedHandler;
