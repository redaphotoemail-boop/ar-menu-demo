import type { Dish, Job } from "@/lib/db/schema";
import { engine } from "@/lib/ai/engines";
import { money } from "@/lib/defaults";
import { Status } from "@/components/ui";
import { Icon } from "@/components/icons";

const KIND: Record<string, { label: string; icon: keyof typeof Icon }> = {
  film: { label: "Dish film", icon: "film" },
  model3d: { label: "AR model", icon: "ar" },
  photo_recreate: { label: "Pro photo", icon: "image" },
  image_create: { label: "Studio image", icon: "image" },
};

export function ago(d: Date | string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function JobRow({ job, dish, showCost = false, restaurantName }: { job: Job; dish?: Dish; showCost?: boolean; restaurantName?: string }) {
  const k = KIND[job.kind] ?? KIND.film;
  const I = Icon[k.icon];
  const out = job.output as { videoUrl?: string; imageUrl?: string; glbUrl?: string; poster?: string; sample?: boolean };
  const thumb = out.poster || out.imageUrl || (job.input as { imageUrl?: string }).imageUrl || dish?.imageUrl;
  return (
    <div className="flex items-center gap-4 rounded-3xl bg-surface px-4 py-3">
      <div className="relative size-14 flex-none overflow-hidden rounded-2xl bg-surface-2">
        {thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : null}
        <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-white/90 text-ink"><I className="size-3.5" /></span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium truncate">{k.label}{dish ? ` · ${dish.name}` : ""}</div>
        <div className="text-[12.5px] text-mute truncate">
          {restaurantName ? `${restaurantName} · ` : ""}{job.ref} · {engine(job.engine)?.name ?? job.engine} · {ago(job.createdAt)}
          {showCost ? ` · ${money(job.costCents)}` : ""}
        </div>
        {job.error && job.status !== "succeeded" ? <div className="text-[12.5px] text-warn mt-0.5 line-clamp-2">{job.error}</div> : null}
      </div>
      <div className="flex items-center gap-3">
        {job.status === "succeeded" && out.videoUrl ? <a href={out.videoUrl} target="_blank" className="text-[13px] underline underline-offset-4">Watch</a> : null}
        {job.status === "succeeded" && out.imageUrl ? <a href={out.imageUrl} target="_blank" className="text-[13px] underline underline-offset-4">View</a> : null}
        {job.status === "succeeded" && out.glbUrl && job.dishId ? <a href={`/ar/${job.dishId}`} target="_blank" className="text-[13px] underline underline-offset-4">AR</a> : null}
        <Status value={job.status} />
      </div>
    </div>
  );
}
