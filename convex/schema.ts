import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  doctors: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    specialization: v.string(),
    experience: v.number(),
    education: v.string(),
    about: v.string(),
    fees: v.number(),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    }),
    isAvailable: v.boolean(),
    image: v.optional(v.id("_storage")),
    availableSlots: v.array(v.object({
      date: v.string(),
      time: v.string(),
      isBooked: v.boolean(),
    })),
  })
    .index("by_specialization", ["specialization"])
    .index("by_availability", ["isAvailable"])
    .searchIndex("search_doctors", {
      searchField: "name",
      filterFields: ["specialization", "isAvailable"],
    }),

  appointments: defineTable({
    patientId: v.id("users"),
    doctorId: v.id("doctors"),
    date: v.string(),
    time: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    symptoms: v.optional(v.string()),
    notes: v.optional(v.string()),
    fees: v.number(),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("refunded")
    ),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    message: v.string(),
    isAI: v.boolean(),
    context: v.optional(v.object({
      type: v.union(
        v.literal("booking"),
        v.literal("doctor_search"),
        v.literal("appointment_info"),
        v.literal("general")
      ),
      data: v.optional(v.any()),
    })),
  })
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("appointment_confirmed"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_reminder"),
      v.literal("doctor_assigned")
    ),
    isRead: v.boolean(),
    appointmentId: v.optional(v.id("appointments")),
  })
    .index("by_user", ["userId"])
    .index("by_read_status", ["userId", "isRead"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
