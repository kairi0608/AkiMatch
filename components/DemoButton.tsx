"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { scheduleRepository } from "@/lib/storage/api-repository";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return <button className="btn secondary" type="button" disabled={loading} onClick={async () => { setLoading(true); try { const schedule = await scheduleRepository.seedDemo(); router.push(`/schedule/${schedule.id}`); } finally { setLoading(false); } }}><PlayCircle size={19} />{loading ? "デモを準備中…" : "デモを試す"}</button>;
}
