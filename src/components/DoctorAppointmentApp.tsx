import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DoctorList } from "./DoctorList";
import { AppointmentList } from "./AppointmentList";
import { ChatBot } from "./ChatBot";
import { NotificationCenter } from "./NotificationCenter";

export function DoctorAppointmentApp() {
  const [activeTab, setActiveTab] = useState<"doctors" | "appointments" | "chat">("doctors");
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab("doctors")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "doctors"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Find Doctors
              </button>
              <button
                onClick={() => setActiveTab("appointments")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "appointments"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                My Appointments
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "chat"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                AI Assistant
              </button>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <NotificationCenter onClose={() => setShowNotifications(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "doctors" && <DoctorList />}
        {activeTab === "appointments" && <AppointmentList />}
        {activeTab === "chat" && <ChatBot />}
      </div>
    </div>
  );
}
