import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 入场 · 季度复盘会",
  description: "发送邀请函，说一句签到。会务名单、专属邀请与欢迎仪式。",
  referrer: "no-referrer",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
