"use client";

import Link from "next/link";
import { Pencil, UserCheck } from "lucide-react";
import type { ParticipantCredential } from "@/lib/storage/response-credentials";

export function ExistingResponses({
  credentials,
}: {
  credentials: ParticipantCredential[];
}) {
  if (!credentials.length) return null;
  return <section className="existing-responses">
    <div className="existing-responses-heading"><span><UserCheck size={19} /></span><div><strong>この端末から回答済みです</strong><p>自分の回答は後から修正・削除できます。</p></div></div>
    <div className="existing-response-list">{credentials.map((credential) => <div key={credential.participantId}><span>{credential.participantName}さんの回答</span><Link href={`/schedule/${encodeURIComponent(credential.scheduleId)}/response/${encodeURIComponent(credential.participantId)}`}><Pencil size={15} />回答を修正</Link></div>)}</div>
  </section>;
}

