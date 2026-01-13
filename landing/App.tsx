import React from "react";
import { FAQ } from "./sections/FAQ";
import { Hero } from "./sections/Hero";
import { Navbar } from "./sections/Navbar";
import { Footer } from "./sections/Footer";
import { Features } from "./sections/Features";
import { HowItWorks } from "./sections/HowItWorks";
import { PRIMARY_COLOR } from "./constants/colors";
import { PerformanceBenchmarks } from "./sections/PerformanceBenchmarks";

export default function App() {
  return (
    <div
      className="min-h-screen selection:text-white bg-[#121212]"
      style={
        {
          "--selection-bg": PRIMARY_COLOR,
        } as React.CSSProperties & { "--selection-bg": string }
      }
    >
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <PerformanceBenchmarks />
      {/* <QuickStart /> */}
      <FAQ />
      <Footer />
    </div>
  );
}
