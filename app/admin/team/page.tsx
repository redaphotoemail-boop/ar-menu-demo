import { desc } from "drizzle-orm";
import { requireStaff, STAFF_ROLES } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { Field, Input, PageHead, SectionTitle, Select } from "@/components/ui";
import { ago } from "@/components/JobRow";
import { addStaff, setRole, setUserStatus } from "../actions";

export const metadata = { title: "Team" };

const ROLE_HELP: Record<string, string> = {
  owner: "Everything, including settings and money.",
  manager: "Clients, studio and jobs. No settings.",
  finance: "Dashboard, finance and plans.",
  studio: "Studio, jobs and client media.",
};

export default async function Team() {
  const me = await requireStaff(["owner"]);
  const db = await getDb();
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  const staff = users.filter((u) => STAFF_ROLES.includes(u.role));
  return (
    <>
      <PageHead eyebrow="Team" title="Who runs it with you." sub="Add a person by email. They sign in with Google (or set a password) using that same email." />
      <div className="grid lg:grid-cols-[1fr_360px] gap-12 items-start">
        <div className="space-y-1.5">
          {staff.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface px-5 py-4">
              <div className="grid size-10 place-items-center rounded-full bg-white font-medium">{u.name.slice(0, 1)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{u.name}{u.id === me.id ? " (you)" : ""}</div>
                <div className="text-[13px] text-mute">{u.email} · {u.lastSeenAt ? `seen ${ago(u.lastSeenAt)}` : "not signed in yet"}{u.status !== "active" ? " · suspended" : ""}</div>
              </div>
              {u.role === "owner" ? <span className="text-[13px] text-mute">Owner</span> : (
                <div className="flex items-center gap-3">
                  <form action={setRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <Select name="role" defaultValue={u.role} className="!h-9 !text-[13px] !w-36">
                      <option value="manager">Manager</option><option value="finance">Finance</option><option value="studio">Studio</option><option value="client">Remove access</option>
                    </Select>
                    <button className="text-[13px] underline underline-offset-4">Save</button>
                  </form>
                  <form action={setUserStatus}>
                    <input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                    <button className="text-[13px] text-mute hover:text-bad">{u.status === "active" ? "Suspend" : "Reactivate"}</button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
        <div>
          <form action={addStaff} className="rounded-[2rem] bg-surface p-6 space-y-4">
            <div className="font-medium">Add someone</div>
            <Field label="Name"><Input name="name" className="!bg-white" /></Field>
            <Field label="Email"><Input name="email" type="email" required className="!bg-white" /></Field>
            <Field label="Role"><Select name="role" className="!bg-white"><option value="manager">Manager</option><option value="studio">Studio</option><option value="finance">Finance</option></Select></Field>
            <button className="h-11 w-full rounded-full bg-ink text-ivory text-sm font-medium">Add to team</button>
          </form>
          <SectionTitle>Roles</SectionTitle>
          <ul className="space-y-3 text-[13px]">{Object.entries(ROLE_HELP).map(([k, v]) => <li key={k}><span className="font-medium capitalize">{k}</span> — <span className="text-mute">{v}</span></li>)}</ul>
        </div>
      </div>
    </>
  );
}
