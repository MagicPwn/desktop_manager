import { Check, Layers3, Sparkles, Tags, X } from "lucide-react";

interface OnboardingProps {
  onComplete(choice: "keep" | "uncategorized" | "suggest"): void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  return (
    <div className="modal-backdrop">
      <section className="onboarding" role="dialog" aria-modal="true">
        <header><div className="onboarding-mark"><Layers3 /></div><div><span>首次设置</span><h1>整理方式由你决定</h1></div></header>
        <p>已为你创建四个基础容器。现有桌面项目不会被移动或删除。</p>
        <div className="onboarding-options">
          <button onClick={() => onComplete("keep")}><Check /><div><strong>保持现状</strong><span>从空容器开始，稍后手动整理</span></div></button>
          <button onClick={() => onComplete("uncategorized")}><Tags /><div><strong>放入未分类</strong><span>建立图标归属，不移动真实文件</span></div></button>
          <button onClick={() => onComplete("suggest")}><Sparkles /><div><strong>生成整理建议</strong><span>按项目类型预览建议，确认后应用</span></div></button>
        </div>
        <button className="skip-button" onClick={() => onComplete("keep")}><X />暂时跳过</button>
      </section>
    </div>
  );
}
