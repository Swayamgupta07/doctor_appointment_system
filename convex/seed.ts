import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDoctors = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if doctors already exist
    const existingDoctors = await ctx.db.query("doctors").collect();
    if (existingDoctors.length > 0) {
      return "Doctors already seeded";
    }

    const doctors = [
      {
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@hospital.com",
        phone: "+1-555-0101",
        specialization: "Cardiology",
        experience: 12,
        education: "MD from Harvard Medical School",
        about: "Experienced cardiologist specializing in heart disease prevention and treatment.",
        fees: 200,
        address: {
          line1: "123 Medical Center Dr",
          city: "New York",
          state: "NY",
          zipCode: "10001",
        },
        isAvailable: true,
      },
      {
        name: "Dr. Michael Chen",
        email: "michael.chen@hospital.com",
        phone: "+1-555-0102",
        specialization: "Dermatology",
        experience: 8,
        education: "MD from Johns Hopkins University",
        about: "Dermatologist focused on skin health and cosmetic procedures.",
        fees: 150,
        address: {
          line1: "456 Health Plaza",
          city: "Los Angeles",
          state: "CA",
          zipCode: "90210",
        },
        isAvailable: true,
      },
      {
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@hospital.com",
        phone: "+1-555-0103",
        specialization: "Pediatrics",
        experience: 15,
        education: "MD from Stanford University",
        about: "Pediatrician dedicated to children's health and development.",
        fees: 120,
        address: {
          line1: "789 Children's Way",
          city: "Chicago",
          state: "IL",
          zipCode: "60601",
        },
        isAvailable: true,
      },
      {
        name: "Dr. James Wilson",
        email: "james.wilson@hospital.com",
        phone: "+1-555-0104",
        specialization: "Orthopedics",
        experience: 20,
        education: "MD from Mayo Clinic",
        about: "Orthopedic surgeon specializing in joint replacement and sports medicine.",
        fees: 250,
        address: {
          line1: "321 Sports Medicine Blvd",
          city: "Miami",
          state: "FL",
          zipCode: "33101",
        },
        isAvailable: true,
      },
      {
        name: "Dr. Lisa Thompson",
        email: "lisa.thompson@hospital.com",
        phone: "+1-555-0105",
        specialization: "Neurology",
        experience: 18,
        education: "MD from UCLA",
        about: "Neurologist specializing in brain and nervous system disorders.",
        fees: 300,
        address: {
          line1: "654 Brain Center Ave",
          city: "Seattle",
          state: "WA",
          zipCode: "98101",
        },
        isAvailable: true,
      },
    ];

    // Generate available slots for each doctor
    const generateSlots = () => {
      const slots = [];
      const today = new Date();
      
      for (let i = 1; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateString = date.toISOString().split('T')[0];
        
        // Morning slots (9 AM - 12 PM)
        for (let hour = 9; hour < 12; hour++) {
          slots.push({
            date: dateString,
            time: `${hour.toString().padStart(2, '0')}:00`,
            isBooked: false,
          });
        }
        
        // Evening slots (2 PM - 6 PM)
        for (let hour = 14; hour < 18; hour++) {
          slots.push({
            date: dateString,
            time: `${hour.toString().padStart(2, '0')}:00`,
            isBooked: false,
          });
        }
      }
      
      return slots;
    };

    for (const doctor of doctors) {
      await ctx.db.insert("doctors", {
        ...doctor,
        availableSlots: generateSlots(),
      });
    }

    return `Seeded ${doctors.length} doctors successfully`;
  },
});
