"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SimplePage from "@/components/SimplePage";
import { createClient } from "@/lib/supabase/client";

type SpaceType = "personal" | "shared";

type Space = {
  id: string;
  name: string;
  type: SpaceType;
  monthly_budget: number;
  description: string;
  created_by: string;
  created_at: string;
};

type SpaceInvitation = {
  id: string;
  space_id: string;
  space_name: string;
  invited_email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  accepted_at: string | null;
};

const moneyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function getSpaceTypeLabel(type: SpaceType) {
  return type === "personal" ? "Personal" : "Compartido";
}

export default function SpacesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [invitations, setInvitations] = useState<SpaceInvitation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const [name, setName] = useState("");
  const [type, setType] = useState<SpaceType>("personal");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("No se pudo validar la sesión.");
      setIsLoading(false);
      return;
    }

    const email = (user.email ?? "").toLowerCase();

    setUserId(user.id);
    setUserEmail(email);

    const { data: spacesData, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (spacesError) {
      setMessage(spacesError.message);
      setIsLoading(false);
      return;
    }

    const { data: invitationsData, error: invitationsError } = await supabase
      .from("space_invitations")
      .select("*")
      .eq("invited_email", email)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (invitationsError) {
      setMessage(invitationsError.message);
      setIsLoading(false);
      return;
    }

    setSpaces(spacesData ?? []);
    setInvitations(invitationsData ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const numericAmount = Number(amount);

    if (!name.trim() || !description.trim() || numericAmount < 0) {
      setMessage("Completa todos los campos correctamente.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("spaces")
      .insert({
        name,
        type,
        monthly_budget: numericAmount,
        description,
        created_by: userId,
      })
      .select()
      .single();

    setIsSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSpaces((current) => [data, ...current]);

    setName("");
    setType("personal");
    setAmount("");
    setDescription("");
    setMessage("Mapa financiero creado correctamente.");
  }

  async function removeSpace(id: string) {
    setMessage("");

    const { error } = await supabase.from("spaces").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSpaces((current) => current.filter((space) => space.id !== id));
    setMessage("Mapa eliminado correctamente.");
  }

  async function sendInvitation(space: Space) {
    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    const email = (inviteEmails[space.id] ?? "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      setMessage("Escribe un correo válido para invitar.");
      return;
    }

    if (email === userEmail) {
      setMessage("No puedes invitarte a ti mismo.");
      return;
    }

    setIsInviting(space.id);
    setMessage("");

    const { error } = await supabase.from("space_invitations").insert({
      space_id: space.id,
      space_name: space.name,
      invited_email: email,
      invited_by: userId,
      status: "pending",
    });

    setIsInviting(null);

    if (error) {
      if (error.message.includes("duplicate key")) {
        setMessage("Esa persona ya tiene una invitación para este mapa.");
        return;
      }

      setMessage(error.message);
      return;
    }

    setInviteEmails((current) => ({ ...current, [space.id]: "" }));
    setMessage(`Invitación enviada a ${email}.`);
  }

  async function acceptInvitation(invitation: SpaceInvitation) {
    if (!userId) {
      setMessage("No hay usuario activo.");
      return;
    }

    setIsAccepting(invitation.id);
    setMessage("");

    const { error: memberError } = await supabase.from("space_members").insert({
      space_id: invitation.space_id,
      user_id: userId,
      role: "member",
    });

    if (memberError && !memberError.message.includes("duplicate key")) {
      setIsAccepting(null);
      setMessage(memberError.message);
      return;
    }

    const { error: invitationError } = await supabase
      .from("space_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    setIsAccepting(null);

    if (invitationError) {
      setMessage(invitationError.message);
      return;
    }

    setMessage(`Te uniste al mapa ${invitation.space_name}.`);
    await loadData();
  }

  async function declineInvitation(invitation: SpaceInvitation) {
    setIsAccepting(invitation.id);
    setMessage("");

    const { error } = await supabase
      .from("space_invitations")
      .update({
        status: "declined",
      })
      .eq("id", invitation.id);

    setIsAccepting(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setInvitations((current) =>
      current.filter((item) => item.id !== invitation.id),
    );
    setMessage("Invitación rechazada.");
  }

  return (
    <SimplePage
      title="Mapas financieros"
      description="Crea espacios personales o compartidos para organizar el flujo de dinero de cada mes."
    >
      {invitations.length > 0 && (
        <section className="mb-8 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <h2 className="text-2xl font-bold">Invitaciones pendientes</h2>
          <p className="mt-2 text-sm text-slate-300">
            Tienes mapas compartidos esperando tu aprobación.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                className="rounded-3xl border border-white/10 bg-slate-950 p-5"
              >
                <p className="text-sm text-slate-400">Mapa compartido</p>
                <h3 className="mt-2 text-xl font-bold">
                  {invitation.space_name}
                </h3>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => acceptInvitation(invitation)}
                    disabled={isAccepting === invitation.id}
                    className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAccepting === invitation.id
                      ? "Procesando..."
                      : "Aceptar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => declineInvitation(invitation)}
                    disabled={isAccepting === invitation.id}
                    className="rounded-full border border-white/10 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-white/10 bg-slate-900 p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Crear mapa financiero</h2>
            <p className="mt-2 text-sm text-slate-400">
              Los mapas se guardan en Supabase y pueden compartirse por invitación.
            </p>
          </div>

          <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Base de datos activa
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Nombre del mapa">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Mi mapa personal, hogar, pareja"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Tipo de mapa">
            <select
              value={type}
              onChange={(event) => setType(event.target.value as SpaceType)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
            >
              <option value="personal">Personal</option>
              <option value="shared">Compartido</option>
            </select>
          </Field>

          <Field label="Monto inicial o presupuesto">
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              min="0"
              placeholder="Ej: 2500000"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>

          <Field label="Descripción">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Mapa para gastos del hogar"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
            />
          </Field>
        </div>

        {message && (
          <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm text-slate-300">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="mt-6 rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Guardando..." : "Guardar mapa"}
        </button>
      </form>

      {isLoading ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <p className="text-slate-400">Cargando mapas financieros...</p>
        </section>
      ) : spaces.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Aún no tienes mapas</h2>
          <p className="mt-2 text-sm text-slate-400">
            Crea tu primer mapa personal o acepta una invitación compartida.
          </p>
        </section>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {spaces.map((space) => (
            <article
              key={space.id}
              className="rounded-3xl border border-white/10 bg-slate-900 p-6"
            >

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{space.name}</h2>
                  <span className="mt-3 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                    {getSpaceTypeLabel(space.type)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/spaces/${space.id}`}
                    className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    Entrar
                  </Link>

                  {space.created_by === userId && (
                    <button
                      type="button"
                      onClick={() => removeSpace(space.id)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>



              <p className="mt-4 text-3xl font-black">
                {moneyFormatter.format(Number(space.monthly_budget))}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {space.description}
              </p>

              {space.type === "shared" && space.created_by === userId && (
                <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-4">
                  <p className="text-sm font-semibold text-white">
                    Invitar persona
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Escribe el correo de la persona que quieres sumar a este mapa.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={inviteEmails[space.id] ?? ""}
                      onChange={(event) =>
                        setInviteEmails((current) => ({
                          ...current,
                          [space.id]: event.target.value,
                        }))
                      }
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
                    />

                    <button
                      type="button"
                      onClick={() => sendInvitation(space)}
                      disabled={isInviting === space.id}
                      className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isInviting === space.id ? "Enviando..." : "Invitar"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </SimplePage>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
