import Link from "next/link";

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="section-label">Release detail</p>
      <h1 className="text-xl font-medium text-bone tracking-tight">
        Server store offline
      </h1>
      <p className="text-[13px] text-ash/60 leading-relaxed">
        Release <span className="text-bone/80">{id}</span> lives in the DB-backed
        pipeline. Lab mode uses local persistence on{" "}
        <Link href="/releases" className="text-accent underline-offset-2 hover:underline">
          /releases
        </Link>
        .
      </p>
      <Link
        href="/releases"
        className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-medium text-void"
      >
        Back to proof cycle
      </Link>
    </div>
  );
}
