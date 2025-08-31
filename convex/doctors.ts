import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    specialization: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let doctors;

    if (args.search) {
      doctors = await ctx.db
        .query("doctors")
        .withSearchIndex("search_doctors", (q) =>
          q.search("name", args.search!)
            .eq("isAvailable", true)
        )
        .collect();
    } else if (args.specialization) {
      doctors = await ctx.db
        .query("doctors")
        .withIndex("by_specialization", (q) =>
          q.eq("specialization", args.specialization!)
        )
        .filter((q) => q.eq(q.field("isAvailable"), true))
        .collect();
    } else {
      doctors = await ctx.db
        .query("doctors")
        .withIndex("by_availability", (q) => q.eq("isAvailable", true))
        .collect();
    }

    return Promise.all(
      doctors.map(async (doctor) => ({
        ...doctor,
        imageUrl: doctor.image ? await ctx.storage.getUrl(doctor.image) : null,
      }))
    );
  },
});

export const getById = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    const doctor = await ctx.db.get(args.doctorId);
    if (!doctor) return null;

    return {
      ...doctor,
      imageUrl: doctor.image ? await ctx.storage.getUrl(doctor.image) : null,
    };
  },
});

export const getSpecializations = query({
  args: {},
  handler: async (ctx) => {
    const doctors = await ctx.db.query("doctors").collect();
    const specializations = [...new Set(doctors.map(d => d.specialization))];
    return specializations.sort();
  },
});

export const getAvailableSlots = query({
  args: { doctorId: v.id("doctors") },
  handler: async (ctx, args) => {
    const doctor = await ctx.db.get(args.doctorId);
    if (!doctor) return [];

    return doctor.availableSlots.filter(slot => !slot.isBooked);
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Generate available slots for the next 30 days
    const availableSlots = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      // Add morning slots (9 AM - 12 PM)
      for (let hour = 9; hour < 12; hour++) {
        availableSlots.push({
          date: dateString,
          time: `${hour.toString().padStart(2, '0')}:00`,
          isBooked: false,
        });
      }
      
      // Add evening slots (2 PM - 6 PM)
      for (let hour = 14; hour < 18; hour++) {
        availableSlots.push({
          date: dateString,
          time: `${hour.toString().padStart(2, '0')}:00`,
          isBooked: false,
        });
      }
    }

    return await ctx.db.insert("doctors", {
      ...args,
      isAvailable: true,
      availableSlots,
    });
  },
});
