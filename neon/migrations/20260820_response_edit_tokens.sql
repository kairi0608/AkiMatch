-- 既存のAkiMatch Neon DBへ、回答者本人用の編集token hashを追加します。
-- 既存回答はedit_token_hashがNULLのまま残り、安全上、本人編集の対象にはなりません。

alter table participants
add column if not exists edit_token_hash text;

alter table participants
add column if not exists updated_at timestamptz not null default now();

