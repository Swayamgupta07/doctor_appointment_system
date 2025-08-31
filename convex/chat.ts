import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    message: v.string(),
    context: v.optional(v.object({
      type: v.union(
        v.literal("booking"),
        v.literal("doctor_search"),
        v.literal("appointment_info"),
        v.literal("general")
      ),
      data: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Save user message
    await ctx.db.insert("chatMessages", {
      userId,
      message: args.message,
      isAI: false,
      context: args.context,
    });

    // Trigger AI response
    await ctx.scheduler.runAfter(0, internal.chat.generateAIResponse, {
      userId,
      userMessage: args.message,
      context: args.context,
    });

    return true;
  },
});

export const generateAIResponse = internalAction({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    context: v.optional(v.object({
      type: v.union(
        v.literal("booking"),
        v.literal("doctor_search"),
        v.literal("appointment_info"),
        v.literal("general")
      ),
      data: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    // Get user's recent appointments and doctors for context
    const appointments = await ctx.runQuery(api.appointments.list);
    const doctors = await ctx.runQuery(api.doctors.list, {});
    const specializations = await ctx.runQuery(api.doctors.getSpecializations);

    const systemPrompt = `You are a helpful AI assistant for a doctor appointment booking system. 
    
    Available specializations: ${specializations.join(", ")}
    
    Current context:
    - User has ${appointments.length} appointments
    - There are ${doctors.length} available doctors
    
    You can help users with:
    1. Finding doctors by specialization
    2. Booking appointments
    3. Checking appointment status
    4. General health information
    
    Be concise, helpful, and always ask clarifying questions when needed.
    If a user wants to book an appointment, ask for their preferred specialization, date, and any symptoms.
    
    User message: "${args.userMessage}"
    Context type: ${args.context?.type || "general"}`;

    try {
      const response = await fetch(`${process.env.CONVEX_OPENAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.userMessage }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      // Save AI response
      await ctx.runMutation(internal.chat.saveAIMessage, {
        userId: args.userId,
        message: aiMessage,
        context: args.context,
      });

    } catch (error) {
      console.error("AI response error:", error);
      
      // Fallback response
      let fallbackMessage = "I'm here to help you with doctor appointments! ";
      
      if (args.userMessage.toLowerCase().includes("book") || args.userMessage.toLowerCase().includes("appointment")) {
        fallbackMessage += "To book an appointment, I'll need to know:\n1. What type of doctor do you need?\n2. Your preferred date\n3. Any symptoms you're experiencing";
      } else if (args.userMessage.toLowerCase().includes("doctor") || args.userMessage.toLowerCase().includes("specialist")) {
        fallbackMessage += `We have doctors in these specializations: ${specializations.slice(0, 5).join(", ")}. Which one interests you?`;
      } else {
        fallbackMessage += "You can ask me to help you find doctors, book appointments, or check your existing appointments. What would you like to do?";
      }

      await ctx.runMutation(internal.chat.saveAIMessage, {
        userId: args.userId,
        message: fallbackMessage,
        context: args.context,
      });
    }
  },
});

export const saveAIMessage = internalMutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
    context: v.optional(v.object({
      type: v.union(
        v.literal("booking"),
        v.literal("doctor_search"),
        v.literal("appointment_info"),
        v.literal("general")
      ),
      data: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      userId: args.userId,
      message: args.message,
      isAI: true,
      context: args.context,
    });
  },
});
