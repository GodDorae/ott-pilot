import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import DevBanner from "@/components/DevBanner";

/**
 * 본문 서체.
 *
 * 한글 서브셋을 반드시 포함한다. latin 만 받으면 한글은 참여자 기기의 시스템 폰트
 * (윈도우 맑은 고딕 / 맥 애플 SD 산돌고딕 …)로 떨어져, 같은 자극물이 사람마다 다른
 * 글자 크기·굵기로 보인다. 시각디자인 실험에서 이건 그냥 두면 안 되는 오차다.
 *
 * next/font 는 빌드 때 폰트를 받아 우리 도메인에서 서빙하고 unicode-range 를 유지하므로,
 * 브라우저는 화면에 실제로 쓰인 글자 범위만 내려받는다 (외부 요청 없음).
 */
const noto = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
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
        <DevBanner />
        {children}
      </body>
    </html>
  );
}
