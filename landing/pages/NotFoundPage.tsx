import React from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../sections/Navbar";

export function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main className="px-6 pt-32 pb-24">
        <div className="max-w-[900px] mx-auto">
          <h1 className="text-4xl md:text-6xl font-heading text-white tracking-tight">
            Page not found
          </h1>
          <p className="mt-4 text-white/60 text-lg">
            The page you’re looking for doesn’t exist.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-white hover:bg-white/10 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

