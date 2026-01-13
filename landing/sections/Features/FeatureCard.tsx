import React from "react";
import { PRIMARY_COLORS } from "../../constants/colors";

export const FeatureCard = ({
  icon: Icon,
  title,
  description,
  colorClass,
}: {
  icon: any;
  title: string;
  description: string;
  colorClass: string;
}) => (
  <div className="p-8 md:p-12 flex flex-col items-start group relative">
    <div
      className={`w-16 h-16 rounded-2xl mb-8 flex items-center justify-center relative overflow-hidden transition-transform duration-500 group-hover:scale-110 shadow-lg ${colorClass}`}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
      <Icon className="text-white relative z-10" size={32} />
      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white/20 blur-xl rounded-full" />
    </div>
    <h3
      className="text-2xl font-semibold mb-4 tracking-tight transition-colors text-white"
      style={{ color: "white" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = PRIMARY_COLORS["40"];
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "white";
      }}
    >
      {title}
    </h3>
    <p className="text-white/50 leading-relaxed text-lg font-light">
      {description}
    </p>
  </div>
);
