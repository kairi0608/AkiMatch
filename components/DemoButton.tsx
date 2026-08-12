"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { scheduleRepository } from "@/lib/storage/prototype-repository";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return <button className="btn secondary" type="button" disabled={loading} onClick={() => { setLoading(true); const schedule = scheduleRepository.seedDemo(); router.push(`/schedule/${schedule.id}`); }}><PlayCircle size={19} />{loading ? "デモを準備中…" : "デモを試す"}</button>;
}
