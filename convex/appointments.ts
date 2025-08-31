import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .order("desc")
      .collect();

    return Promise.all(
      appointments.map(async (appointment) => {
        const doctor = await ctx.db.get(appointment.doctorId);
        return {
          ...appointment,
          doctor: doctor ? {
            name: doctor.name,
            specialization: doctor.specialization,
            imageUrl: doctor.image ? await ctx.storage.getUrl(doctor.image) : null,
          } : null,
        };
      })
    );
  },
});

export const book = mutation({
  args: {
    doctorId: v.id("doctors"),
    date: v.string(),
    time: v.string(),
    symptoms: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const doctor = await ctx.db.get(args.doctorId);
    if (!doctor) throw new Error("Doctor not found");

    // Check if slot is available
    const slotIndex = doctor.availableSlots.findIndex(
      slot => slot.date === args.date && slot.time === args.time && !slot.isBooked
    );

    if (slotIndex === -1) {
      throw new Error("This slot is no longer available");
    }

    // Mark slot as booked
    const updatedSlots = [...doctor.availableSlots];
    updatedSlots[slotIndex].isBooked = true;

    await ctx.db.patch(args.doctorId, {
      availableSlots: updatedSlots,
    });

    // Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      patientId: userId,
      doctorId: args.doctorId,
      date: args.date,
      time: args.time,
      status: "pending",
      symptoms: args.symptoms,
      fees: doctor.fees,
      paymentStatus: "pending",
    });

    // Send notification
    await ctx.db.insert("notifications", {
      userId,
      title: "Appointment Booked",
      message: `Your appointment with Dr. ${doctor.name} has been booked for ${args.date} at ${args.time}`,
      type: "appointment_confirmed",
      isRead: false,
      appointmentId,
    });

    // Auto-confirm appointment after 1 minute (in real app, this would be immediate or after payment)
    await ctx.scheduler.runAfter(60000, internal.appointments.confirmAppointment, {
      appointmentId,
    });

    return appointmentId;
  },
});

export const cancel = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");

    if (appointment.patientId !== userId) {
      throw new Error("Not authorized to cancel this appointment");
    }

    // Update appointment status
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
    });

    // Free up the slot
    const doctor = await ctx.db.get(appointment.doctorId);
    if (doctor) {
      const updatedSlots = doctor.availableSlots.map(slot => {
        if (slot.date === appointment.date && slot.time === appointment.time) {
          return { ...slot, isBooked: false };
        }
        return slot;
      });

      await ctx.db.patch(appointment.doctorId, {
        availableSlots: updatedSlots,
      });
    }

    // Send notification
    await ctx.db.insert("notifications", {
      userId,
      title: "Appointment Cancelled",
      message: `Your appointment for ${appointment.date} at ${appointment.time} has been cancelled`,
      type: "appointment_cancelled",
      isRead: false,
      appointmentId: args.appointmentId,
    });

    return true;
  },
});

export const confirmAppointment = internalMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return;

    await ctx.db.patch(args.appointmentId, {
      status: "confirmed",
    });

    await ctx.db.insert("notifications", {
      userId: appointment.patientId,
      title: "Appointment Confirmed",
      message: "Your appointment has been confirmed by the doctor",
      type: "appointment_confirmed",
      isRead: false,
      appointmentId: args.appointmentId,
    });
  },
});
