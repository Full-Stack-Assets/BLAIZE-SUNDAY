import { VideoLab } from "@/components/VideoLab";

export default function VideoLabPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="section-label mb-1">Autonomous Video Factory</p>
        <h1 className="text-xl font-medium tracking-tight text-bone">Wisebase video lab</h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ash/50">
          A provider-neutral evidence wrapper with Wisebase as the only active generator in v0.2a. Provider completion, captions, technical inspection, and verification remain separate states.
        </p>
      </div>
      <VideoLab />
    </div>
  );
}
