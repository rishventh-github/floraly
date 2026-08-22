"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { getInitials } from "@/lib/auth";

export default function GroupsPage() {
  const { user } = useAuth();
  const {
    followedPeople,
    myGroups,
    createGroup,
    setGroupMembers,
    leaveGroup,
    deleteGroup,
  } = useSocial();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const peopleById = useMemo(() => {
    const map = new Map(followedPeople.map((p) => [p.id, p]));
    if (user) {
      map.set(user.id, {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
      });
    }
    return map;
  }, [followedPeople, user]);

  if (!user) return null;

  const toggleMember = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    const group = createGroup(name, selected);
    if (group) {
      setName("");
      setSelected([]);
    }
  };

  const editing = editingId
    ? myGroups.find((g) => g.id === editingId) ?? null
    : null;

  return (
    <div
      className="min-h-dvh bg-cream-100"
      style={{ paddingBottom: "var(--nav-height)" }}
    >
      <header className="border-b border-moss-200/50 bg-cream-50/80 px-6 py-6 pr-28 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <Link
            href="/home"
            className="mb-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-forest-600"
          >
            ‹ Home
          </Link>
          <h1 className="font-display text-2xl text-ink">Groups</h1>
          <p className="mt-1 text-sm text-stone-500">
            Private circles made from people you follow. Circle posts reach group
            members and people you follow.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6 py-6">
        <section className="rounded-2xl bg-surface p-5 ring-1 ring-stone-200">
          <h2 className="font-display text-lg text-ink">Create a group</h2>
          <label className="mt-3 block text-sm font-medium text-ink-muted">
            Name
          </label>
          <input
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trail crew, family, etc."
            className="mt-1.5 w-full rounded-xl border border-stone-200 bg-cream-50 px-4 py-2.5 text-sm focus:border-forest-400 focus:outline-none"
          />
          <p className="mt-3 text-sm font-medium text-ink-muted">
            Add people you follow
          </p>
          {followedPeople.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              Follow someone first from their profile, then you can add them
              here.
            </p>
          ) : (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {followedPeople.map((person) => {
                const on = selected.includes(person.id);
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => toggleMember(person.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
                        on
                          ? "bg-forest-50 ring-1 ring-forest-200"
                          : "hover:bg-cream-50"
                      }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-600 text-xs font-medium text-white">
                        {getInitials(person.displayName)}
                      </span>
                      <span className="flex-1 truncate text-ink">
                        {person.displayName}
                      </span>
                      <span className="text-xs text-stone-500">
                        {on ? "Added" : "Add"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="mt-4 w-full rounded-xl bg-forest-600 py-2.5 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-40"
          >
            Create group
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg text-ink">Your groups</h2>
          {myGroups.length === 0 ? (
            <p className="rounded-2xl bg-surface p-5 text-sm text-stone-500 ring-1 ring-stone-200">
              No groups yet. Create one above to share circle posts privately.
            </p>
          ) : (
            myGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-2xl bg-surface p-5 ring-1 ring-stone-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{group.name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {group.memberIds.length} member
                      {group.memberIds.length === 1 ? "" : "s"}
                      {group.ownerId === user.id ? " · you own this" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.ownerId === user.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(
                              editingId === group.id ? null : group.id
                            )
                          }
                          className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-medium text-ink"
                        >
                          {editingId === group.id ? "Done" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteGroup(group.id)}
                          className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => leaveGroup(group.id)}
                        className="rounded-lg bg-cream-100 px-2.5 py-1 text-xs font-medium text-ink"
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {group.memberIds.map((id) => (
                    <li
                      key={id}
                      className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] text-ink"
                    >
                      {peopleById.get(id)?.displayName ?? "Member"}
                      {id === user.id ? " (you)" : ""}
                    </li>
                  ))}
                </ul>
                {editing?.id === group.id && group.ownerId === user.id ? (
                  <div className="mt-4 border-t border-stone-100 pt-4">
                    <p className="text-xs font-medium text-ink-muted">
                      Members (people you follow)
                    </p>
                    <ul className="mt-2 space-y-1">
                      {followedPeople.map((person) => {
                        const on = group.memberIds.includes(person.id);
                        return (
                          <li key={person.id}>
                            <button
                              type="button"
                              onClick={() => {
                                const next = on
                                  ? group.memberIds.filter(
                                      (id) => id !== person.id
                                    )
                                  : [...group.memberIds, person.id];
                                setGroupMembers(group.id, next);
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-cream-50"
                            >
                              <span className="text-ink">
                                {person.displayName}
                              </span>
                              <span className="text-xs text-stone-500">
                                {on ? "Remove" : "Add"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
