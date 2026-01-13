import React from "react";

export const MetricsCard = ({
  bgColor,
  title,
  actionText,
  icon: Icon,
  metricValue,
  textColor = "#000",
}: {
  bgColor: string;
  title: string;
  actionText: string;
  icon: any;
  metricValue: string;
  textColor?: string;
}) => (
  <div
    className={`${bgColor} rounded-none p-8 md:p-12 flex flex-col justify-between aspect-[4/5] relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 max-w-[400px] max-h-[500px] mx-auto w-full border-none shadow-none`}
  >
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full scale-150" />
        <Icon
          size={110}
          className={`text-[${textColor}] relative z-10 group-hover:rotate-6 transition-transform duration-500`}
          strokeWidth={1.5}
        />
      </div>
      <div
        className={`font-heading text-6xl text-[${textColor}] mb-2 tracking-tighter`}
      >
        {metricValue}
      </div>
    </div>

    <div className={`pt-6 border-t-2 border-[${textColor}]/10`}>
      <h3
        className={`text-2xl font-semibold text-[${textColor}] mb-4 leading-tight`}
      >
        {title}
      </h3>
      <button
        className={`flex items-center gap-3 text-[${textColor}] font-bold uppercase tracking-widest text-[11px] group/btn`}
      >
        {actionText}
      </button>
    </div>
  </div>
);
