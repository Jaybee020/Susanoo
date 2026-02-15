import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PRIMARY_COLOR } from "./constants/colors";
import { HomePage } from "./pages/HomePage";
import { ArticlePage } from "./pages/ArticlePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ScrollToHash } from "./pages/ScrollToHash";

export default function App() {
  return (
    <div
      className="min-h-screen selection:text-white bg-[#121212]"
      style={
        {
          "--selection-bg": PRIMARY_COLOR,
        } as React.CSSProperties & { "--selection-bg": string }
      }
    >
      <BrowserRouter>
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/article/:postid" element={<ArticlePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
