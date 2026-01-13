import WebGLImage from "./WebGLImage";
import { Zap, Lock, ArrowRight } from "lucide-react";
import { PRIMARY_COLOR, PRIMARY_COLORS } from "../../constants/colors";

export const Hero = () => (
  <section className="relative pt-32 pb-20 px-6 bg-grid overflow-hidden">
    <div
      className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] blur-[120px] rounded-full -z-10"
      style={{ backgroundColor: PRIMARY_COLORS["20"] }}
    />
    <div className="max-w-7xl mx-auto">
      <div className="max-w-3xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-6 font-mono tracking-widest uppercase"
          style={{
            backgroundColor: PRIMARY_COLORS["10"],
            borderColor: PRIMARY_COLORS["20"],
            color: PRIMARY_COLORS.LIGHT,
          }}
        >
          <Zap size={14} /> Built on Fhenix Network
        </div>
        <h1 className="text-5xl md:text-7xl font-heading leading-tight mb-6 text-white tracking-tight">
          Securing trades <br />
          <span className="gradient-text">from input to output</span>
        </h1>
        <p className="text-xl text-white/60 mb-10 leading-relaxed max-w-2xl font-light">
          The first implementation of encrypted conditional trading logic on
          Uniswap V4. Stop-loss and Take-profit orders that remain completely
          hidden until execution.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            style={{ backgroundColor: PRIMARY_COLORS.DARK }}
            className="text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 transition-all group"
          >
            Start Trading{" "}
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 transition-all">
            Read Whitepaper
          </button>
        </div>
      </div>

      <div className="mt-20 relative rounded-2xl border border-white/10 bg-[#121212]/40 backdrop-blur-md p-2 shadow-2xl animate-float">
        <WebGLImage
          src="/hero-1.jpg"
          alt="Dashboard Preview"
          className="rounded-xl grayscale opacity-80 max-h-[700px] w-full object-cover object-top"
        />

        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
          <div
            className="bg-[#121212]/90 p-8 rounded-2xl backdrop-blur-xl flex flex-col gap-4 max-w-md w-full"
            style={{ borderColor: PRIMARY_COLORS["30"] }}
          >
            <div className="flex items-center gap-3">
              <Lock style={{ color: PRIMARY_COLORS["40"] }} />
              <span className="font-mono text-sm text-white">
                encrypted_order_packet
              </span>
            </div>
            <div
              className="font-mono text-[10px] break-all leading-tight"
              style={{ color: PRIMARY_COLORS["60"] }}
            >
              0x82fF9aFd8f496c3d6ac40E2a0F28E47488CFc9... <br />
              AES-GCM: 44f2c8d19a2e3b4c5d6e7f8g9h0i...
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full w-2/3 animate-pulse"
                style={{ backgroundColor: PRIMARY_COLOR }}
              ></div>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] text-center font-semibold font-mono">
              Homomorphic Evaluation in Progress
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
);
