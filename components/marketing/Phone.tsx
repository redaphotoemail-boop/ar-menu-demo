/* A live template inside a phone frame. The engine runs in the iframe —
   tap through it like a diner would. */
export function Phone({ tpl, menu, label, className = "", dish }: { tpl?: string; menu?: string; label?: string; className?: string; dish?: number }) {
  const params = new URLSearchParams({ chrome: "0" });
  if (tpl) params.set("tpl", tpl);
  if (menu) params.set("menu", menu);
  if (dish != null) params.set("dish", String(dish));
  return (
    <figure className={`flex flex-col items-center ${className}`}>
      <div className="phone">
        <iframe src={`/engine/index.html?${params}`} title={label ?? "Menu preview"} loading="lazy" />
      </div>
      {label ? <figcaption className="mt-5 text-[13px] text-mute">{label}</figcaption> : null}
    </figure>
  );
}
