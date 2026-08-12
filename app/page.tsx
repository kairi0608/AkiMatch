import Link from "next/link";
import { ArrowRight, CalendarRange, ChevronRight, Sparkles, UsersRound } from "lucide-react";
import { DemoButton } from "@/components/DemoButton";

export default function Home() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14} /> Smart scheduling</span>
        <h1>全員の予定を見る<br />必要はありません。</h1>
        <p className="hero-lead">空いているところだけ、次の人へ。回答が増えるたびに候補を自動で絞り、ぴったりの時間がなくても参加しやすい候補を見つけます。</p>
        <div className="hero-actions"><Link className="btn" href="/create">日程調整を作成 <ArrowRight size={19} /></Link><DemoButton /></div>
        <p className="hero-note">登録不要・すぐに作成できます</p>
      </div>
      <div className="hero-visual" aria-label="候補が絞り込まれるイメージ">
        <div className="visual-top"><span>次の候補</span><strong>3件</strong></div>
        <div className="candidate-preview featured"><span className="preview-date">8月21日（木）</span><strong>15:00 — 17:00</strong><span className="match-pill">全員参加できます</span></div>
        <div className="candidate-preview"><span className="preview-date">8月23日（土）</span><strong>10:00 — 12:00</strong><span className="people-stack">A&nbsp; B&nbsp; C&nbsp; +2</span></div>
        <div className="visual-foot"><UsersRound size={17} /> 5人の回答から自動計算</div>
      </div>
    </section>
    <section className="how-it-works" id="how-it-works">
      <div className="section-title"><span className="eyebrow">How it works</span><h2>答えるほど、候補がすっきり。</h2></div>
      <div className="steps">
        <article><span>01</span><CalendarRange /><h3>範囲を決める</h3><p>開始日と期間、時間帯を選ぶだけ。30日分を自動で用意します。</p></article><ChevronRight className="step-arrow" />
        <article><span>02</span><UsersRound /><h3>空き時間をつなぐ</h3><p>次の人には、これまでの回答から残った候補だけを表示します。</p></article><ChevronRight className="step-arrow" />
        <article><span>03</span><Sparkles /><h3>おすすめが決まる</h3><p>連続時間と参加しやすさを計算し、候補をランキングします。</p></article>
      </div>
    </section>
  </>;
}
