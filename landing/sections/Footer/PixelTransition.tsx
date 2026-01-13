import React, { useMemo } from "react";

export const PixelTransition = () => {
  const pixels = useMemo(() => {
    const grid = [];
    const rows = 4;
    const cols = 40; // Approximate columns for full width
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Higher probability of being filled as we go down (r increases)
        const threshold = (r + 1) / (rows + 1);
        if (Math.random() < threshold * 1.5) {
          grid.push({ r, c });
        }
      }
    }
    return grid;
  }, []);

  return (
    <div className="w-full overflow-hidden bg-white leading-none h-16 relative">
      <div
        className="grid absolute inset-0"
        style={{
          gridTemplateColumns: "repeat(40, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
        }}
      >
        {pixels.map((pixel, i) => (
          <div
            key={i}
            className="bg-[#121212]"
            style={{
              gridRow: pixel.r + 1,
              gridColumn: pixel.c + 1,
            }}
          />
        ))}
      </div>
    </div>
  );
};
