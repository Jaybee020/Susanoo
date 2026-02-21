import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navbar } from "../sections/Navbar";
import { ARTICLES } from "../content/articles";

const articleList = Object.values(ARTICLES);

export function ArticlesPage() {
  return (
    <>
      <Helmet>
        <title>Articles | Susanoo</title>
        <meta
          name="description"
          content="Deep dives on Susanoo's private execution stack, limit orders, and the intent layer."
        />
        <meta property="og:title" content="Susanoo Articles" />
        <meta
          property="og:description"
          content="Explore how Susanoo builds private limit orders, tackles MEV, and rethinks DeFi intent."
        />
        <meta property="og:type" content="website" />
      </Helmet>
      <Navbar />
      <main className="px-6 pt-32 pb-24">
        <div className="max-w-6xl mx-auto">
          <header className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.2em] text-purple-200/70">
              Knowledge Base
            </p>
            <h1 className="text-4xl md:text-6xl font-heading text-white tracking-tight mt-3">
              Articles & research
            </h1>
            <p className="mt-6 text-white/70 text-lg md:text-xl leading-relaxed">
              Essays on private execution, encrypted intents, and how Susanoo is
              expanding what is possible inside AMMs.
            </p>
          </header>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            {articleList.map((article) => (
              <Link
                key={article.slug}
                to={`/article/${article.slug}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/30 hover:bg-white/10"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Article
                </p>
                <h2 className="mt-3 text-2xl font-heading text-white group-hover:text-white">
                  {article.title}
                </h2>
                <p className="mt-4 text-white/70 leading-relaxed">
                  {article.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {article.pills.map((pill) => (
                    <span
                      key={pill}
                      className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/60"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <div className="mt-6 text-sm font-semibold text-purple-200 group-hover:text-purple-100">
                  Read article →
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
