"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  ShieldCheck,
  Trash2,
  Trophy,
} from "lucide-react";
import type { Availability, AvailabilityStatus } from "@/types/availability";
import type { Participant } from "@/types/participant";
import type { ScheduleBundle } from "@/lib/storage/repository";
import type { AvailabilitySourceMap } from "@/lib/ai/types";
import { selectCandidates } from "@/lib/scheduling/candidate-filter";
import { slotKey } from "@/lib/scheduling/time-slots";
import { scheduleRepository } from "@/lib/storage/api-repository";
import {
  findResponseCredential,
  readResponseTokenFragment,
  removeResponseCredential,
  responseManagementPath,
  saveResponseCredential,
  type ParticipantCredential,
} from "@/lib/storage/response-credentials";
import { AvailabilityResponseEditor } from "@/components/schedule/AvailabilityResponseEditor";
import { CandidateBanner } from "@/components/schedule/CandidateBanner";
import { CandidateSummary } from "@/components/schedule/CandidateSummary";
import { DeleteResponseDialog } from "@/components/schedule/DeleteResponseDialog";

type ParticipantResponse = {
  participant: Participant;
  availability: Availability[];
};

export default function ParticipantResponsePage() {
  const { id, participantId } = useParams<{ id: string; participantId: string }>();
  const router = useRouter();
  const [bundle, setBundle] = useState<ScheduleBundle | null>(null);
  const [response, setResponse] = useState<ParticipantResponse | null>(null);
  const [credential, setCredential] = useState<ParticipantCredential | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const fragmentToken = readResponseTokenFragment(window.location.hash);
    const localCredential = findResponseCredential(id, participantId);
    const editToken = fragmentToken ?? localCredential?.editToken;
    if (!editToken) {
      setError("回答を管理する情報がありません。回答した端末から開くか、回答管理リンクを使用してください。");
      setLoaded(true);
      return;
    }

    Promise.all([
      scheduleRepository.getBundle(id),
      scheduleRepository.getParticipantResponse(id, participantId, editToken),
    ])
      .then(([latestBundle, latestResponse]) => {
        if (!latestBundle) throw new Error("この日程調整は見つかりませんでした。");
        const verifiedCredential: ParticipantCredential = {
          scheduleId: id,
          participantId,
          participantName: latestResponse.participant.name,
          editToken,
        };
        saveResponseCredential(verifiedCredential);
        setCredential(verifiedCredential);
        setBundle(latestBundle);
        setResponse(latestResponse);
        if (fragmentToken) {
          window.history.replaceState(null, "", window.location.pathname);
        }
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "回答を読み込めませんでした。");
      })
      .finally(() => setLoaded(true));
  }, [id, participantId]);

  const selection = useMemo(
    () => bundle
      ? selectCandidates(bundle.schedule, bundle.participants, bundle.availabilities)
      : null,
    [bundle],
  );
  const initialStatuses = useMemo(
    () => Object.fromEntries(
      (response?.availability ?? []).map((item) => [slotKey(item), item.status]),
    ) as Record<string, AvailabilityStatus>,
    [response],
  );
  const initialSources = useMemo(
    () => Object.fromEntries(
      (response?.availability ?? []).map((item) => [slotKey(item), item.source]),
    ) as AvailabilitySourceMap,
    [response],
  );

  const updateResponse = async (
    name: string,
    availability: Omit<Availability, "participantId">[],
  ) => {
    if (!credential) throw new Error("回答を管理する情報がありません。");
    await scheduleRepository.updateParticipantResponse(
      id,
      participantId,
      credential.editToken,
      name,
      availability,
    );
    const updatedCredential = { ...credential, participantName: name };
    saveResponseCredential(updatedCredential);
    const [latestBundle, latestResponse] = await Promise.all([
      scheduleRepository.getBundle(id),
      scheduleRepository.getParticipantResponse(id, participantId, credential.editToken),
    ]);
    if (!latestBundle) throw new Error("更新後の日程調整を読み込めませんでした。");
    setCredential(updatedCredential);
    setBundle(latestBundle);
    setResponse(latestResponse);
    setEditorVersion((current) => current + 1);
    setSuccess("回答を更新しました。最新の回答を使って候補を再計算しました。");
  };

  const copyManagementUrl = async () => {
    if (!credential) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${responseManagementPath(credential)}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const deleteResponse = async () => {
    if (!credential || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await scheduleRepository.deleteParticipantResponse(
        id,
        participantId,
        credential.editToken,
      );
      removeResponseCredential(id, participantId);
      router.replace(`/schedule/${id}`);
      router.refresh();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "回答を削除できませんでした。");
      setDeleting(false);
    }
  };

  if (!loaded) return <div className="loading-state"><span /><p>本人確認と回答の読み込みをしています…</p></div>;
  if (error || !bundle || !response || !credential || !selection) {
    return <div className="empty-state page-empty"><ShieldCheck /><strong>回答を管理できません</strong><p>{error || "回答の認証情報を確認できませんでした。"}</p><Link className="btn secondary" href={`/schedule/${id}`}><ArrowLeft size={17} />日程調整へ戻る</Link></div>;
  }

  return <div className="schedule-shell response-management-shell">
    <header className="schedule-heading">
      <div><span className="eyebrow"><ShieldCheck size={14} /> Your response</span><h1>{bundle.schedule.title}</h1><p>{response.participant.name}さんの回答を修正できます。</p></div>
      <div className="heading-actions"><button className="btn secondary compact" type="button" onClick={copyManagementUrl}><Clipboard size={16} />{copied ? "コピーしました" : "管理リンクをコピー"}</button><Link className="btn secondary compact" href={`/result/${id}`}><Trophy size={16} />現在の結果</Link></div>
    </header>

    {success && <div className="response-update-success" role="status"><CheckCircle2 size={20} /><div><strong>回答を更新しました</strong><span>最新の回答を使って候補を再計算しました。</span></div></div>}

    <CandidateBanner selection={selection} participantCount={bundle.participants.length} />
    <CandidateSummary selection={selection} participantCount={bundle.participants.length} />

    <AvailabilityResponseEditor
      key={`${participantId}-${editorVersion}`}
      schedule={bundle.schedule}
      selection={selection}
      initialName={response.participant.name}
      initialStatuses={initialStatuses}
      initialSources={initialSources}
      defaultViewMode="CALENDAR"
      nameEditable
      description="以前保存した全期間の回答を表示しています。個別入力・一括入力・AIおまかせ入力を使って修正できます。"
      submitLabel="変更を保存"
      onSubmit={updateResponse}
    />

    <section className="response-danger-zone"><div><small>回答の管理</small><h2>回答を削除</h2><p>この回答者の登録予定をすべて削除します。削除後は残りの参加者だけで候補を再計算します。</p></div><button type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }}><Trash2 size={16} />回答を削除</button></section>

    <Link className="response-back-link" href={`/schedule/${id}`}><ArrowLeft size={16} />日程調整へ戻る</Link>

    {deleteOpen && <DeleteResponseDialog participantName={response.participant.name} deleting={deleting} error={deleteError} onCancel={() => { if (!deleting) setDeleteOpen(false); }} onConfirm={deleteResponse} />}
  </div>;
}
