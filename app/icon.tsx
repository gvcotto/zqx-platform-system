import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #0f62fe 0%, #0b4fd1 60%, #161616 100%)",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 28,
          fontFamily: "Arial, sans-serif",
          letterSpacing: 0,
        }}
      >
        ZQX
      </div>
    ),
    size,
  );
}
