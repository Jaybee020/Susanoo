import React from "react";
import { Github } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PRIMARY_COLOR } from "../constants/colors";

export const Navbar = () => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121212]/50 backdrop-blur-xl border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center font-semibold text-lg text-white">
            <img src="/logo.svg" alt="Susanoo" className="w-full h-full" />
          </div>
          <span className="text-xl font-semibold text-white">Susanoo</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
          {isHome ? (
            <>
              <a
                href="#overview"
                className="hover:text-white transition-colors"
              >
                Overview
              </a>
              <a
                href="#how-it-works"
                className="hover:text-white transition-colors"
              >
                Architecture
              </a>
              <a href="#metrics" className="hover:text-white transition-colors">
                Performance
              </a>
            </>
          ) : (
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4 text-white">
          <a
            href="https://github.com/Jaybee020/Susanoo"
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Github size={20} />
          </a>
          <a
            href="https://susanoo-app.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:text-white transition-all"
            style={{ backgroundColor: "white" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = PRIMARY_COLOR;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Launch App
          </a>
        </div>
      </div>
    </nav>
  );
};
