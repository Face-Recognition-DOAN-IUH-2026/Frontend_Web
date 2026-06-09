"use client";

import { useAuth } from "@/lib/auth-context";
import { UserPlus, UserCheck, Search, Eye } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  const features = [
    {
      title: "Enroll Face",
      description: "Register your face for future authentication",
      icon: UserPlus,
      href: "/enroll",
      color: "bg-blue-500",
    },
    {
      title: "Verify Face",
      description: "Verify your identity against a registered user",
      icon: UserCheck,
      href: "/verify",
      color: "bg-green-500",
    },
    {
      title: "Identify Face",
      description: "Find a person from the database",
      icon: Search,
      href: "/identify",
      color: "bg-purple-500",
    },
    {
      title: "Liveness Check",
      description: "Verify if the face is real and alive",
      icon: Eye,
      href: "/liveness",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome, {user?.email}</h1>
        <p className="text-gray-600">
          Choose a face recognition feature to get started
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <a
              key={feature.href}
              href={feature.href}
              className="block p-6 bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${feature.color} p-3 rounded-lg text-white`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}