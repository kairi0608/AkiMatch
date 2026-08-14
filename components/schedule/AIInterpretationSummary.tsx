import { CalendarClock, Heart, ShieldCheck } from "lucide-react";
import type { AIAvailabilityResponse, AvailabilityRule } from "@/lib/ai/types";
import { STATUS_META } from "./status";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const CONFIDENCE_LABEL = { HIGH: "確度 高", MEDIUM: "確度 中", LOW: "確度 低" };

function ruleTarget(rule: AvailabilityRule) {
  if (rule.type === "WEEKDAY") return `${rule.weekdays.map((day) => WEEKDAYS[day]).join("・")}曜日`;
  if (rule.type === "DATE") return rule.date;
  return `${rule.startDate}〜${rule.endDate}`;
}

export function AIInterpretationSummary({ result }: { result: AIAvailabilityResponse }) {
  return (
    <div className="ai-interpretation">
      <div className="ai-understood-heading"><ShieldCheck size={20} /><div><span>AIはこのように理解しました</span><strong>{result.summary}</strong></div></div>
      <div className="ai-summary-columns">
        <section>
          <h4><CalendarClock size={16} />AIが理解した予定</h4>
          {result.availabilityRules.length ? <div className="ai-rule-list">{result.availabilityRules.map((rule, index) => (
            <article key={rule.id ?? `${rule.type}-${index}`}>
              <div><strong>{ruleTarget(rule)}</strong><span>{String(rule.startHour).padStart(2, "0")}:00〜{String(rule.endHour).padStart(2, "0")}:00</span></div>
              <span className={`ai-rule-status status-${rule.status.toLowerCase()}`}>{STATUS_META[rule.status].label}</span>
              <small>{rule.confidence ? CONFIDENCE_LABEL[rule.confidence] : ""}{rule.reason ? ` · ${rule.reason}` : ""}</small>
            </article>
          ))}</div> : <p className="ai-empty-note">参加可否を変更する予定は読み取られませんでした。</p>}
        </section>
        <section>
          <h4><Heart size={16} />希望</h4>
          {result.preferences.length ? <div className="ai-preference-list">{result.preferences.map((preference, index) => (
            <article key={`${preference.type}-${index}`}><strong>{preference.value}</strong><span>{preference.reason}</span></article>
          ))}</div> : <p className="ai-empty-note">日時の希望は読み取られませんでした。</p>}
          <small className="preference-note">希望は参加可否を上書きせず、今回のプレビュー情報として分けて扱います。</small>
        </section>
      </div>
    </div>
  );
}
