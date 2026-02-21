import React from "react";
import { Link, useParams } from "react-router-dom";
import { Navbar } from "../sections/Navbar";
import { ARTICLES } from "../content/articles";

function ArticleSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-28">
      <h2 className="text-2xl md:text-3xl font-heading text-white mb-3">
        {title}
      </h2>
      <div className="text-lg md:text-xl text-white/70 leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}

export function ArticlePage() {
  const { postid } = useParams();
  const article = postid
    ? ARTICLES[postid?.toLowerCase() as keyof typeof ARTICLES]
    : undefined;

  if (!article) {
    return (
      <>
        <Navbar />
        <main className="px-6 pt-32 pb-24">
          <div className="max-w-[900px] mx-auto">
            <h1 className="text-4xl md:text-6xl font-heading text-white tracking-tight">
              Article not found
            </h1>
            <p className="mt-4 text-white/60 text-lg">
              We couldn’t find that article.
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

  return (
    <>
      <Navbar />
      <main className="px-6 pt-32 pb-24">
        <div className="max-w-[900px] mx-auto">
          <header>
            <h1 className="text-4xl md:text-6xl font-heading text-white tracking-tight">
              {article.title}
            </h1>

            <p className="mt-5 text-white/60 text-lg md:text-xl leading-relaxed">
              {article.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {article.pills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1 text-sm text-purple-200"
                >
                  {pill}
                </span>
              ))}
            </div>
          </header>

          {article.sections.map((s) => (
            <ArticleSection key={s.id} id={s.id} title={s.title}>
              {s.content}
            </ArticleSection>
          ))}

          {article.footerNote ? (
            <footer className="mt-16 pt-6 border-t border-white/10 text-sm text-white/40">
              {article.footerNote}
            </footer>
          ) : null}
        </div>
      </main>
    </>
  );
}
