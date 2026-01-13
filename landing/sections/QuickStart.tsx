import React from "react";
import { Terminal, Github } from "lucide-react";
import { PRIMARY_COLOR, PRIMARY_COLORS } from "../constants/colors";

export const QuickStart = () => (
  <section
    id="quickstart"
    className="py-24 px-6 bg-white border-t border-gray-100"
  >
    <div className="max-w-7xl mx-auto">
      <div className="p-8 md:p-16 rounded-[3rem] bg-gray-50 border border-gray-200 relative overflow-hidden group">
        <div
          className="absolute top-0 right-0 w-64 h-64 blur-[80px] -z-10 transition-all"
          style={{
            backgroundColor: PRIMARY_COLORS["5"],
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = PRIMARY_COLORS["10"];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = PRIMARY_COLORS["5"];
          }}
        />
        <h2 className="text-5xl font-heading mb-10 text-black tracking-tight">
          Quick Start
        </h2>
        <div className="space-y-4 font-mono text-sm">
          <div
            className="p-6 rounded-2xl bg-white border border-gray-200 flex items-center gap-6 shadow-sm transition-colors group/code"
            style={{ borderColor: "rgb(229, 231, 235)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = PRIMARY_COLORS["30"];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgb(229, 231, 235)";
            }}
          >
            <span className="text-gray-300 font-bold font-heading">1</span>
            <code className="truncate" style={{ color: PRIMARY_COLOR }}>
              git clone https://github.com/your-org/susanoo.git
            </code>
          </div>
          <div
            className="p-6 rounded-2xl bg-white border border-gray-200 flex items-center gap-6 shadow-sm transition-colors group/code"
            style={{ borderColor: "rgb(229, 231, 235)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = PRIMARY_COLORS["30"];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgb(229, 231, 235)";
            }}
          >
            <span className="text-gray-300 font-bold font-heading">2</span>
            <code style={{ color: PRIMARY_COLOR }}>
              npm install && forge install
            </code>
          </div>
          <div
            className="p-6 rounded-2xl bg-white border border-gray-200 flex items-center gap-6 shadow-sm transition-colors group/code"
            style={{ borderColor: "rgb(229, 231, 235)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = PRIMARY_COLORS["30"];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgb(229, 231, 235)";
            }}
          >
            <span className="text-gray-300 font-bold font-heading">3</span>
            <code style={{ color: PRIMARY_COLOR }}>
              forge build && forge test -vvv
            </code>
          </div>
        </div>
        <div className="mt-12 flex flex-col md:flex-row gap-4">
          <button
            className="flex-1 bg-black text-white py-5 rounded-2xl font-semibold transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/10"
            style={{ backgroundColor: "black" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "black";
            }}
          >
            <Terminal size={18} /> Documentation
          </button>
          <button className="flex-1 bg-white border border-gray-300 text-black py-5 rounded-2xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
            <Github size={18} /> View on Github
          </button>
        </div>
      </div>
    </div>
  </section>
);
