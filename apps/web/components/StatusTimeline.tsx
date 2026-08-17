import type { DistributionStatus } from "../lib/release-view";
import { buildReleaseTimeline } from "../lib/release-view";

export function StatusTimeline({ status }: { status: DistributionStatus }) {
  return (
    <div className="timeline" aria-label={`Release status: ${status}`}>
      {buildReleaseTimeline(status).map((step, index) => (
        <div
          className={`timeline-step timeline-${step.state}`}
          key={step.status}
          aria-current={step.state === "CURRENT" ? "step" : undefined}
        >
          <b>{String(index + 1).padStart(2, "0")}</b>
          {step.status.replaceAll("_", " ")}
        </div>
      ))}
    </div>
  );
}
