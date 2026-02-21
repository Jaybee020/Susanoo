import React from "react";
import { PixelTransition } from "./PixelTransition";
import { Link } from "react-router-dom";

export const Footer = () => (
  <>
    <PixelTransition />
    <footer className="bg-[#121212] pt-32 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="flex flex-col gap-6">
            <Link
              to="/articles"
              className="text-white/60 hover:text-white transition-colors"
            >
              Articles
            </Link>
            <a
              href="https://x.com/yinka_ganiyu"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              Support
            </a>
          </div>
          <div className="flex flex-col gap-6">
            <a
              href="https://github.com/Jaybee020/Susanoo"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://x.com/yinka_ganiyu"
              target="_blank"
              rel="noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              X (Twitter)
            </a>
          </div>
          <div className="lg:col-span-2 hidden lg:block"></div>
        </div>

        <div className="mb-20">
          <h1 className="text-[15vw] leading-none font-heading text-white tracking-tighter lowercase">
            susanoo
          </h1>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div className="text-white/40 text-sm font-light">
            Powered by FHE for total trade privacy.
          </div>

          <div className="text-white/40 text-sm font-light">
            © 2025 Susanoo Protocol Inc.
          </div>
        </div>
      </div>
    </footer>
  </>
);
