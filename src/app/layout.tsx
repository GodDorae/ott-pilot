import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import DevBanner from "@/components/DevBanner";
import FixedTopProgress from "@/components/FixedTopProgress";

const noto = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "OTT 플랫폼 추천 기능에 대한 사용자 경험 연구",
  description: "홍익대학교 대학원 시각디자인 전공 석사학위논문 실험 설문",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={noto.variable + " h-full antialiased"}>
      <body className="min-h-full flex flex-col">
        <FixedTopProgress />
        <DevBanner />
        {children}
      </body>
    </html>
  );
}
