import React from "react";
import { FAQ } from "../sections/FAQ";
import { Hero } from "../sections/Hero";
import { Navbar } from "../sections/Navbar";
import { Footer } from "../sections/Footer";
import { Features } from "../sections/Features";
import { HowItWorks } from "../sections/HowItWorks";
import { PerformanceBenchmarks } from "../sections/PerformanceBenchmarks";

export function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <PerformanceBenchmarks />
      {/* <QuickStart /> */}
      <FAQ />
      <Footer />
    </>
  );
}

