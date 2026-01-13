import React from "react";
import { PRIMARY_COLOR, PRIMARY_COLORS } from "../constants/colors";

export const HowItWorks = () => (
  <section
    id="how-it-works"
    className="py-32 px-6 bg-white/[0.02] border-y border-white/5"
  >
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-4xl md:text-6xl font-heading mb-10 text-white tracking-tight">
            The Architecture
          </h2>
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Client-Side Encryption",
                desc: "Use cofhe.js to encrypt your trigger price and order type locally before submission.",
              },
              {
                step: "02",
                title: "On-Chain Storage",
                desc: "Encrypted orders are stored in the Susanoo hook contract on the Fhenix network.",
              },
              {
                step: "03",
                title: "Homomorphic Evaluation",
                desc: "Every swap triggers a private check of all pending orders without decrypting their data.",
              },
              {
                step: "04",
                title: "Threshold Decryption",
                desc: "Only when conditions are met does the Fhenix network release the execution signal.",
              },
            ].map((item, idx) => (
              <div key={idx} className="flex gap-6 group">
                <div
                  className="text-3xl font-heading opacity-80"
                  style={{ color: PRIMARY_COLOR }}
                >
                  {item.step}
                </div>
                <div>
                  <h4
                    className="text-xl font-semibold mb-2 transition-colors text-white"
                    style={{ color: "white" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = PRIMARY_COLOR;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "white";
                    }}
                  >
                    {item.title}
                  </h4>
                  <p className="text-white/50 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden font-mono text-sm shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
              <span className="ml-2 text-white/40 text-[10px] tracking-widest uppercase">
                Order.sol
              </span>
            </div>
            <div className="p-6 overflow-x-auto text-purple-300">
              <pre>
                <code>{`struct Order {
  address trader;
  bool zeroForOne;
  OrderStatus status;
  ebool orderType;      // Encrypted
  euint32 triggerTick; // Encrypted
  uint256 amount;
  PoolId keyId;
}`}</code>
              </pre>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div
              className="p-6 rounded-2xl border text-white"
              style={{
                backgroundColor: PRIMARY_COLORS["10"],
                borderColor: PRIMARY_COLORS["20"],
              }}
            >
              <div
                className="text-xs font-medium mb-2 font-mono uppercase tracking-tighter"
                style={{ color: PRIMARY_COLORS["90"] }}
              >
                Hook Lifecycle
              </div>
              <div className="font-heading text-2xl tracking-tighter">
                afterSwap()
              </div>
            </div>
            <div
              className="p-6 rounded-2xl border text-white"
              style={{
                backgroundColor: PRIMARY_COLORS["10"],
                borderColor: PRIMARY_COLORS["20"],
              }}
            >
              <div
                className="text-xs font-medium mb-2 font-mono uppercase tracking-tighter"
                style={{ color: PRIMARY_COLORS["90"] }}
              >
                FHE Library
              </div>
              <div className="font-heading text-2xl tracking-tighter">
                FHE.sol v2.0
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
