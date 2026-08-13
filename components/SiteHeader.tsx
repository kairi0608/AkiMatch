"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck2 } from "lucide-react";
import { APP_CONFIG } from "@/lib/config";

const navigation = [["/create", "日程を作成"], ["/schedules", "過去の日程"], ["/", "使い方"]] as const;

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={`${APP_CONFIG.appName} ホーム`}>
        <span><CalendarCheck2 size={21} /></span>{APP_CONFIG.appName}
      </Link>
      <nav aria-label="メインナビゲーション">
        {navigation.map(([href, label]) => (
          <Link key={href + label} className={pathname === href ? "active" : ""} href={href}>{label}</Link>
        ))}
      </nav>
    </header>
  );
}
