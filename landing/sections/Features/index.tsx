import React from "react";
import { Shield, Fingerprint, TrendingUp, Layers } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const Features = () => (
  <section
    id="overview"
    className="py-32 border-t border-white/10 bg-[#121212]"
  >
    <div className="w-full">
      <div className="text-center mb-20 px-6">
        <h2 className="text-4xl md:text-6xl font-heading mb-6 tracking-tight text-white">
          Why Susanoo?
        </h2>
        <p className="text-white/40 max-w-2xl mx-auto text-lg uppercase tracking-widest font-mono font-medium">
          Empowering traders with encryption tools to thrive in the dark forest.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 border-y border-white/10 w-full">
        <div className="border-r border-white/10 last:border-r-0">
          <FeatureCard
            icon={Shield}
            title="MEV Immunity"
            description="Zero visibility into stop-loss or take-profit triggers means zero front-running opportunities."
            colorClass="bg-gradient-to-br from-cyan-400 to-blue-600"
          />
        </div>
        <div className="border-r border-white/10 last:border-r-0">
          <FeatureCard
            icon={Fingerprint}
            title="Data Economy"
            description="Build private trading markets where your alpha is an asset, never exposed to searcher bots."
            colorClass="bg-gradient-to-br from-yellow-300 to-[#b48dff]"
          />
        </div>
        <div className="border-r border-white/10 last:border-r-0">
          <FeatureCard
            icon={TrendingUp}
            title="DeFi Native"
            description="Verify order conditions in real time using FHE, preventing scams and toxic flow from bad actors."
            colorClass="bg-gradient-to-br from-white/20 to-white/10 border border-white/30"
          />
        </div>
        <div className="border-r border-white/10 last:border-r-0">
          <FeatureCard
            icon={Layers}
            title="Content & Media"
            description="Create dynamic private experiences, unlocking new ways to monetize strategies and entertain alpha."
            colorClass="bg-gradient-to-br from-cyan-300 via-[#b48dff] to-[#b48dff]"
          />
        </div>
      </div>
    </div>
  </section>
);
