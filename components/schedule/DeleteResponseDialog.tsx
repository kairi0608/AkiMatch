"use client";

import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";

export function DeleteResponseDialog({
  participantName,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  participantName: string;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <div className="delete-dialog-backdrop" role="presentation">
    <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-response-title" aria-describedby="delete-response-description">
      <button className="delete-dialog-close" type="button" aria-label="削除確認を閉じる" disabled={deleting} onClick={onCancel}><X size={18} /></button>
      <span className="delete-warning-icon"><AlertTriangle size={24} /></span>
      <small>Delete response</small>
      <h2 id="delete-response-title">{participantName}さんの回答を削除しますか？</h2>
      <p id="delete-response-description">登録した予定がすべて削除されます。この操作は元に戻せません。</p>
      {error && <p className="delete-dialog-error" role="alert">{error}</p>}
      <div className="delete-dialog-actions"><button type="button" disabled={deleting} onClick={onCancel}>キャンセル</button><button className="confirm-delete-button" type="button" disabled={deleting} onClick={onConfirm}>{deleting ? <><LoaderCircle className="spin-icon" size={17} />削除中…</> : <><Trash2 size={17} />回答を削除</>}</button></div>
    </section>
  </div>;
}

