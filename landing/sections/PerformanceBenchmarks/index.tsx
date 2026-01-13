import React from "react";
import { Shield, Cpu, Activity } from "lucide-react";
import { MetricsCard } from "./MetricsCard";

export const PerformanceBenchmarks = () => (
  <section
    id="metrics"
    className="py-32 pt-40 px-6 bg-white border-t border-gray-100"
  >
    <div className="max-w-7xl mx-auto">
      <h2 className="text-6xl md:text-8xl font-heading text-[#50416f] mb-20 max-w-5xl leading-none tracking-tight">
        Performance <br />
        benchmarks
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-center justify-center">
        <MetricsCard
          bgColor="bg-[#292f87]"
          title="Privacy Level"
          actionText="Learn about FHE"
          icon={Shield}
          metricValue="100%"
          textColor="#ffffff"
        />
        <MetricsCard
          bgColor="bg-[#AE8FF8]"
          title="Gas Overhead"
          actionText="View Benchmark"
          icon={Cpu}
          metricValue="<20%"
          textColor="#4a446a"
        />
        <MetricsCard
          bgColor="bg-[#ba5119]"
          title="Decryption Time"
          actionText="Read Specs"
          icon={Activity}
          metricValue="~1.5s"
          textColor="#fddda5"
        />
      </div>
    </div>
  </section>
);
