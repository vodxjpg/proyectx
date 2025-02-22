"use client";
import { Card, TextInput } from "@tremor/react";
import Particles from '@/components/effects/Particles';
import ForgotForm from "@/components/layout/ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Column - Particles with Centered Text */}
      <div className="hidden lg:flex w-1/2 bg-black relative h-100">
        {/* Particles Background */}
        <Particles
          id="tsparticles"
          options={{
            background: { color: "#000000" },
            particles: {
              number: { value: 200 },
              size: { value: 2 },
              move: { speed: 0.5 },
              color: { value: ["#ffffff", "#ffffff"] },
              opacity: { value: 0.7 },
              shape: { type: "circle" },
            },
          }}
          className="absolute inset-0 h-full w-full"
        />

        {/* Centered Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center z-10">
          <h1 className="text-4xl font-bold">Uhm, you forgot some stuff?</h1>
          <p className="mt-2 text-gray-300">
            No worries, we are here to help.
          </p>
        </div>
      </div>

      {/* Right Column - Signup Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-10">
        <div className="sm:w-full sm:max-w-md">
          <ForgotForm />
        </div>
      </div>
    </div>
  );
}
