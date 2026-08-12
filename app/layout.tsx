import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { APP_CONFIG } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL;
  const image = origin ? `${origin}/og.png` : undefined;
  return {
    title: `${APP_CONFIG.appName} | かしこい日程調整`,
    description: APP_CONFIG.description,
    openGraph: {
      title: `${APP_CONFIG.appName} | かしこい日程調整`,
      description: "空いているところだけ、次の人へ。回答するほど候補がすっきりする日程調整。",
      type: "website",
      images: image ? [{ url: image, width: 1736, height: 908, alt: `${APP_CONFIG.appName} かしこい日程調整` }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${APP_CONFIG.appName} | かしこい日程調整`,
      description: APP_CONFIG.description,
      images: image ? [image] : undefined,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body><SiteHeader /><main>{children}</main><footer><strong>{APP_CONFIG.appName}</strong><span>空いている時間だけをつないで、みんなにやさしい日程調整を。</span><small>Prototypeでは回答をこの端末に保存します。</small></footer></body></html>;
}
