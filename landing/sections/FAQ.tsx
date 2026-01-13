import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRIMARY_COLOR } from "../constants/colors";

export const FAQ = () => {
  const [open, setOpen] = useState<number | null>(0);
  const questions = [
    {
      q: "How is Susanoo different from standard limit orders?",
      a: "Standard limit orders are visible to everyone on-chain. Susanoo uses Fully Homomorphic Encryption (FHE) to keep your trigger price and order type hidden until they are actually executed, preventing MEV and strategy leakage.",
    },
    {
      q: "Does this work with Uniswap V4 pools?",
      a: "Yes, Susanoo is a custom hook designed specifically for Uniswap V4. It leverages the hook lifecycle (specifically afterSwap) to process encrypted order conditions.",
    },
    {
      q: "What is the role of Fhenix Network?",
      a: "Fhenix provides the underlying FHE infrastructure and co-processors required to perform computations on encrypted data without ever revealing it.",
    },
    {
      q: "Is there a gas overhead for privacy?",
      a: "While FHE operations are more intensive than standard EVM calls, our implementation is optimized to keep overhead between 15-20% per order compared to traditional hooks.",
    },
  ];

  return (
    <section className="pt-32 pb-60 px-6 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-5xl font-heading mb-16 text-black tracking-widest uppercase">
          FAQs
        </h2>
        <div className="divide-y divide-gray-100 border-t border-gray-100">
          {questions.map((item, idx) => (
            <div key={idx} className="overflow-hidden">
              <button
                onClick={() => setOpen(open === idx ? null : idx)}
                className="w-full py-8 flex items-center justify-between text-left group"
              >
                <span
                  className="text-xl font-semibold text-black transition-colors"
                  style={{ color: "black" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = PRIMARY_COLOR;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "black";
                  }}
                >
                  {item.q}
                </span>
                <ChevronDown
                  className={`transition-transform text-gray-400 ${
                    open === idx ? "rotate-180" : ""
                  }`}
                  style={{
                    color: open === idx ? PRIMARY_COLOR : undefined,
                  }}
                />
              </button>
              <div
                className={`transition-all duration-300 ${
                  open === idx
                    ? "max-h-60 pb-8 opacity-100"
                    : "max-h-0 opacity-0 overflow-hidden"
                }`}
              >
                <p className="text-gray-500 leading-relaxed text-lg font-light">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
