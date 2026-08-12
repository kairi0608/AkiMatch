"use client";
import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";

export function ParticipantForm({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState("");
  return <form className="participant-form" onSubmit={(event: FormEvent) => { event.preventDefault(); if (name.trim()) onStart(name.trim()); }}><label htmlFor="participant-name">お名前</label><div><input id="participant-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="例：山田 花子" maxLength={40} required autoComplete="name" /><button className="btn" type="submit" disabled={!name.trim()}>回答をはじめる <ArrowRight size={18} /></button></div></form>;
}
