-- =====================================================================
--  TURNI SARCOMI — schema dell'archivio online (Supabase / PostgreSQL)
--  Si incolla UNA VOLTA in Supabase → SQL Editor → Run.
--  Si può rieseguire senza danni (aggiorna le funzioni, non cancella i dati).
-- =====================================================================

-- servizio per inviare le notifiche (già presente in Supabase; se non lo trova non succede nulla)
do $do$ begin create extension if not exists pg_net; exception when others then null; end $do$;

-- ---------- tabelle ----------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emails      text[] not null default '{}',          -- una o più email con cui la persona accede
  category    text not null check (category in ('chirurghi','specializzandi','datamanager')),
  person_key  text,                                    -- identificativo nel calendario dei turni
  is_admin    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Unione "Segreteria" + "Data Manager / RN" = "Personale di supporto" (categoria interna: datamanager). Rieseguibile.
alter table public.staff drop constraint if exists staff_category_check;
update public.staff set category = 'datamanager' where category = 'segreteria';
alter table public.staff add constraint staff_category_check check (category in ('chirurghi','specializzandi','datamanager'));

create table if not exists public.app_state (          -- dati generali: elenco categorie, persone, notifiche
  key    text primary key,
  value  jsonb not null,
  updated_at timestamptz not null default now()
);
update public.app_state
   set value = (select jsonb_agg(case when e ->> 'id' = 'datamanager' then jsonb_set(e, '{label}', '"Personale di supporto"') else e end) from jsonb_array_elements(value) e)
 where key = 'cats' and jsonb_typeof(value) = 'array';

create table if not exists public.weeks (              -- settimane pubblicate (visibili a tutti)
  mon          date primary key,
  data         jsonb not null,
  version      int  not null default 1,
  published_at timestamptz not null default now()
);

create table if not exists public.proposals (          -- proposte/richieste (private: le vede solo chi le ha fatte e Marco)
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references public.staff(id) on delete cascade,
  items      jsonb not null,                           -- [{d:'2026-11-16', k:'ass', h:''}, ...]
  note       text not null default '',
  status     text not null default 'pending' check (status in ('pending','approved','denied')),
  reply      text not null default '',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.proposals add column if not exists entered_by uuid references public.staff(id) on delete set null;   -- chi l'ha inserita, se diversa dall'interessato (Personal Assistant)

create table if not exists public.approved_items (     -- giorni accettati: compaiono nel calendario di tutti
  id          bigserial primary key,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  day         date not null,
  kind        text not null,
  hours       text not null default ''
);
create table if not exists public.kv (                -- archivio dello strumento turni dell'amministratore (griglia, regole, libreria, storico)
  id         text primary key,
  v          text not null default '',
  n          int  not null default 1,
  updated_at timestamptz not null default now()
);
-- profilo aggiuntivo "Master SalaOp" (si somma alla categoria): può indicare chi sta in quale sala e in quale giorno
alter table public.staff add column if not exists is_salaop boolean not null default false;
-- profilo aggiuntivo "Solventi AG" (qualsiasi categoria): assegna secondo e terzo operatore delle sale solventi AG e vede il riepilogo
alter table public.staff add column if not exists is_solvag boolean not null default false;
-- profilo "Personal Assistant" (qualsiasi categoria): gestisce le richieste proprie e quelle della persona che assiste (pa_for),
-- assegna il personale alle sale operatorie e completa la scheda Solventi AG
alter table public.staff add column if not exists is_pa boolean not null default false;
alter table public.staff add column if not exists pa_for uuid references public.staff(id) on delete set null;
-- notifiche che la persona ha scelto di NON ricevere (la notifica dei desiderata è obbligatoria e non compare mai qui)
alter table public.staff add column if not exists notif_off text[] not null default '{}';

-- indicazioni di sala operatoria: giorno + sala + persona + ruolo (nessuna accettazione: le vede l'amministratore)
create table if not exists public.or_assignments (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  room       text not null,
  staff_id   uuid not null references public.staff(id) on delete cascade,
  role       text not null check (role in ('primo','aiuto')),
  note       text not null default '',
  set_by     uuid references public.staff(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (day, staff_id)                                -- una persona ha una sola indicazione al giorno (se la cambi, sostituisce)
);
create index if not exists or_assignments_day_idx on public.or_assignments(day);

create index if not exists approved_items_day_idx on public.approved_items(day);
create index if not exists proposals_staff_idx on public.proposals(staff_id, created_at desc);

-- ---------- chi è chi ----------
create or replace function public.auth_email() returns text
language sql stable as $$ select lower(coalesce(auth.jwt() ->> 'email','')) $$;

create or replace function public.my_staff_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.staff
  where active and public.auth_email() <> '' and public.auth_email() = any(emails)
  limit 1
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.is_admin from public.staff s where s.id = public.my_staff_id()), false)
$$;

create or replace function public.is_pa() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.is_pa from public.staff s where s.id = public.my_staff_id() and s.active), false)
$$;

-- la persona che la Personal Assistant assiste (solo se esiste ed è attiva)
create or replace function public.pa_target() returns uuid
language sql stable security definer set search_path = public as $$
  select t.id from public.staff s join public.staff t on t.id = s.pa_for and t.active
  where s.id = public.my_staff_id() and s.active and s.is_pa
$$;

-- Master SalaOp: chi ha il ruolo oppure è Personal Assistant
create or replace function public.is_salaop() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (s.is_salaop or s.is_pa) from public.staff s where s.id = public.my_staff_id()), false)
$$;

create or replace function public.is_solvag() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (s.is_solvag or s.is_pa) from public.staff s where s.id = public.my_staff_id() and s.active), false)
$$;

-- ---------- titolare della programmazione ----------
-- Con più amministratori, uno solo alla volta è "titolare": riceve e decide le richieste, modifica e pubblica i turni.
-- Se nessuno è stato indicato (o il titolare non è più un amministratore attivo) lo è l'amministratore più anziano.
create or replace function public.titolare_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select s.id from public.staff s
      where s.active and s.is_admin
        and s.id::text = (select a.value ->> 'staff_id' from public.app_state a where a.key = 'titolare')),
    (select s.id from public.staff s where s.active and s.is_admin order by s.created_at, s.id limit 1))
$$;

create or replace function public.is_titolare() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() and public.my_staff_id() = public.titolare_id()
$$;

-- risponde (anche a chi non ha ancora fatto l'accesso) se una email è nell'elenco del personale
create or replace function public.email_allowed(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where active and lower(trim(p_email)) = any(emails))
$$;

create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from (
    select s.id, s.name, s.category, s.person_key, s.is_admin, (s.is_salaop or s.is_pa) as is_salaop, (s.is_solvag or s.is_pa) as is_solvag, s.is_pa,
           case when s.is_pa then public.pa_target() end as pa_for,
           case when s.is_pa then (select t.name from public.staff t where t.id = public.pa_target()) end as pa_for_name,
           s.notif_off,
           (s.is_admin and s.id = public.titolare_id()) as is_titolare,
           case when s.is_admin then (select t.name from public.staff t where t.id = public.titolare_id()) end as titolare_name
    from public.staff s where s.id = public.my_staff_id()
  ) r
$$;

-- elenco nomi/categorie visibile a tutti (senza email)
create or replace function public.directory() returns table(id uuid, name text, category text, person_key text)
language sql stable security definer set search_path = public as $$
  select id, name, category, person_key from public.staff
  where active and public.my_staff_id() is not null
$$;

-- ---------- email sempre minuscole e mai doppie ----------
create or replace function public.staff_clean() returns trigger
language plpgsql as $$
declare e text; clash int;
begin
  new.emails := coalesce((select array_agg(distinct lower(trim(x))) from unnest(new.emails) x where trim(x) <> ''), '{}');
  foreach e in array new.emails loop
    select count(*) into clash from public.staff s where s.id <> new.id and e = any(s.emails);
    if clash > 0 then raise exception 'La email % è già assegnata a un''altra persona', e; end if;
  end loop;
  return new;
end $$;
drop trigger if exists staff_clean_t on public.staff;
create trigger staff_clean_t before insert or update on public.staff for each row execute function public.staff_clean();

-- ---------- chi può avere quali ruoli (i ruoli si possono sommare: es. chirurgo + amministratore + Master SalaOp) ----------
--   amministratore e Master SalaOp: chirurghi e personale di supporto (id datamanager; non gli specializzandi)
create or replace function public.staff_roles_check() returns trigger
language plpgsql as $$
begin
  if new.is_admin and new.category not in ('chirurghi','datamanager') then
    raise exception 'Solo chirurghi e personale di supporto possono essere amministratori';
  end if;
  if new.is_salaop and new.category not in ('chirurghi','datamanager') then
    raise exception 'Solo chirurghi e personale di supporto possono essere Master SalaOp';
  end if;
  if new.is_pa then
    if new.pa_for = new.id then raise exception 'La Personal Assistant non può assistere se stessa: scegli un''altra persona'; end if;
  else
    new.pa_for := null;
  end if;
  return new;
end $$;
drop trigger if exists staff_roles_t on public.staff;
create trigger staff_roles_t before insert or update on public.staff for each row execute function public.staff_roles_check();

-- ---------- promemoria desiderata (notifiche push sul telefono) ----------
-- Ogni telefono che attiva il promemoria registra qui il proprio "indirizzo di consegna"; l'elenco lo legge solo il servizio
-- che invia le notifiche (nessuna policy: i clienti non possono leggere né scrivere direttamente).
create table if not exists public.push_subs (
  endpoint   text primary key,
  staff_id   uuid not null references public.staff(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
-- registro degli invii (evita doppioni: un promemoria a settimana)
create table if not exists public.reminder_log (
  week    date primary key,
  sent_at timestamptz not null default now(),
  n       integer not null default 0
);
alter table public.reminder_log enable row level security;

-- ---------- almeno un amministratore deve sempre restare ----------
create or replace function public.staff_guard() returns trigger
language plpgsql as $$
begin
  if old.is_admin and old.active and (tg_op = 'DELETE' or not (new.is_admin and new.active))
     and not exists (select 1 from public.staff s where s.id <> old.id and s.is_admin and s.active) then
    raise exception 'Deve restare almeno un amministratore attivo';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists staff_guard_t on public.staff;
create trigger staff_guard_t before update or delete on public.staff for each row execute function public.staff_guard();

-- ---------- se una persona viene disattivata/eliminata (o perde un'email) i suoi dispositivi escono subito ----------
-- (i dati sono comunque già bloccati: ogni lettura passa da my_staff_id(), che non riconosce più la persona)
create or replace function public.staff_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
declare gone text[];
begin
  if tg_op = 'DELETE' then gone := old.emails;
  elsif old.active and not new.active then gone := old.emails;
  else gone := array(select unnest(old.emails) except select unnest(new.emails)); end if;
  if gone is not null and cardinality(gone) > 0 then
    begin
      delete from auth.sessions where user_id in (select id from auth.users where lower(email) = any(gone));
    exception when others then null;     -- se Supabase cambia struttura non deve mai bloccare il salvataggio
    end;
  end if;
  return null;
end $$;
drop trigger if exists staff_revoke_t on public.staff;
create trigger staff_revoke_t after update or delete on public.staff for each row execute function public.staff_revoke();

-- ---------- sicurezza a livello di riga ----------
alter table public.staff          enable row level security;
alter table public.app_state      enable row level security;
alter table public.weeks          enable row level security;
alter table public.proposals      enable row level security;
alter table public.approved_items enable row level security;
alter table public.kv             enable row level security;
alter table public.or_assignments enable row level security;

drop policy if exists staff_read   on public.staff;
drop policy if exists staff_admin  on public.staff;
create policy staff_read  on public.staff for select to authenticated using (public.is_admin() or id = public.my_staff_id());
create policy staff_admin on public.staff for all    to authenticated using (public.is_titolare()) with check (public.is_titolare());

drop policy if exists state_read  on public.app_state;
drop policy if exists state_admin on public.app_state;
create policy state_read  on public.app_state for select to authenticated using (public.my_staff_id() is not null and (key <> 'ntfy' or public.is_admin()));
create policy state_admin on public.app_state for all    to authenticated using (public.is_titolare()) with check (public.is_titolare());

drop policy if exists weeks_read  on public.weeks;
drop policy if exists weeks_admin on public.weeks;
create policy weeks_read  on public.weeks for select to authenticated using (public.my_staff_id() is not null);
create policy weeks_admin on public.weeks for all    to authenticated using (public.is_titolare()) with check (public.is_titolare());

drop policy if exists prop_read   on public.proposals;
drop policy if exists prop_delete on public.proposals;
create policy prop_read   on public.proposals for select to authenticated using (public.is_admin() or staff_id = public.my_staff_id() or staff_id = public.pa_target());
create policy prop_delete on public.proposals for delete to authenticated using (public.is_titolare() or ((staff_id = public.my_staff_id() or staff_id = public.pa_target()) and status = 'pending'));

drop policy if exists kv_admin on public.kv;
drop policy if exists kv_read  on public.kv;
drop policy if exists kv_write on public.kv;
drop policy if exists orsel on public.or_assignments;
create policy orsel on public.or_assignments for select to authenticated using (public.is_admin() or public.is_salaop());
create policy kv_read  on public.kv for select to authenticated using (public.is_admin());
create policy kv_write on public.kv for all    to authenticated using (public.is_titolare()) with check (public.is_titolare());

drop policy if exists appr_read on public.approved_items;
create policy appr_read on public.approved_items for select to authenticated using (public.my_staff_id() is not null);

-- ---------- permessi sulle tabelle ----------
revoke all on public.staff, public.app_state, public.weeks, public.proposals, public.approved_items, public.kv from anon, public;
grant select, insert, update, delete on public.kv to authenticated;   -- solo amministratore (RLS)
grant select on public.staff, public.app_state, public.weeks, public.proposals, public.approved_items to authenticated;
grant insert, update, delete on public.staff, public.app_state, public.weeks to authenticated;   -- limitati da RLS ai soli amministratori
grant delete on public.proposals to authenticated;
grant select on public.or_assignments to authenticated;   -- le scritture passano dalle funzioni qui sotto

-- ---------- notifica a Marco (servizio ntfy) ----------
create or replace function public.notify_admin(p_title text, p_msg text) returns void
language plpgsql security definer set search_path = public as $$
declare topic text;
begin
  select value ->> 'topic' into topic from public.app_state where key = 'ntfy';
  if topic is null or topic = '' then return; end if;
  begin
    perform net.http_post(
      url     := 'https://ntfy.sh',
      body    := jsonb_build_object('topic', topic, 'title', p_title, 'message', p_msg, 'priority', 4, 'tags', jsonb_build_array('calendar')),
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  exception when others then
    null;   -- una notifica non riuscita non deve mai bloccare l'invio della richiesta
  end;
end $$;

-- ---------- invio di una proposta ----------
drop function if exists public.submit_proposal(jsonb, text);
create or replace function public.submit_proposal(p_items jsonb, p_note text default '', p_for uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me public.staff%rowtype; tgt public.staff%rowtype; pid uuid; it jsonb; n int; k text; d date; h text; byid uuid;
  allowed text[];   -- chirurghi e specializzandi: Ferie, Permesso, Lezione, Congresso / meeting; personale di supporto: Presente, Smart working, Assente
begin
  select * into me from public.staff where id = public.my_staff_id();
  if me.id is null then raise exception 'Accesso non autorizzato'; end if;
  tgt := me;
  if p_for is not null and p_for <> me.id then
    -- la Personal Assistant può inviare solo per la persona che assiste
    if not coalesce(me.is_pa and p_for = public.pa_target(), false) then raise exception 'Non puoi inviare richieste per questa persona'; end if;
    select * into tgt from public.staff where id = p_for;
    byid := me.id;
  end if;
  allowed := case when tgt.category = 'datamanager' then array['pres','sw','abs'] else array['ass','per','lez','cong'] end;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Richiesta non valida'; end if;
  n := jsonb_array_length(p_items);
  if n < 1 or n > 62 then raise exception 'Numero di giorni non valido (massimo 62)'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    k := it ->> 'k'; h := coalesce(it ->> 'h','');
    begin d := (it ->> 'd')::date; exception when others then raise exception 'Data non valida'; end;
    if not (k = any(allowed)) then raise exception 'Tipo di richiesta non consentito'; end if;
    if d < current_date - 1 then raise exception 'Non si può chiedere un giorno già passato'; end if;
    if length(h) > 40 then raise exception 'Orario troppo lungo'; end if;
  end loop;

  insert into public.proposals(staff_id, items, note, status, decided_at, entered_by)
  values (tgt.id,
          (select jsonb_agg(jsonb_build_object('d', x ->> 'd', 'k', x ->> 'k', 'h', coalesce(x ->> 'h','')) order by x ->> 'd') from jsonb_array_elements(p_items) x),
          left(coalesce(p_note,''), 500),
          case when tgt.is_admin and tgt.id = public.titolare_id() then 'approved' else 'pending' end,
          case when tgt.is_admin and tgt.id = public.titolare_id() then now() end,
          byid)
  returning id into pid;

  if tgt.is_admin and tgt.id = public.titolare_id() then
    insert into public.approved_items(proposal_id, staff_id, day, kind, hours)
    select pid, tgt.id, (x ->> 'd')::date, x ->> 'k', coalesce(x ->> 'h','') from jsonb_array_elements(p_items) x;
  else
    perform public.notify_admin('Nuova richiesta di turno', tgt.name || ' ha inviato una richiesta' || case when byid is not null then ' (inserita da ' || me.name || ')' else '' end || ' (' || n || ' giorn' || case when n = 1 then 'o' else 'i' end || '). Aprila per accettarla o negarla.');
  end if;
  return pid;
end $$;

-- ---------- decisione di Marco ----------
create or replace function public.decide_proposal(p_id uuid, p_status text, p_reply text default '') returns void
language plpgsql security definer set search_path = public as $$
declare pr public.proposals%rowtype;
begin
  if not public.is_titolare() then raise exception 'Solo il titolare della programmazione può decidere'; end if;
  if p_status not in ('pending','approved','denied') then raise exception 'Stato non valido'; end if;
  select * into pr from public.proposals where id = p_id;
  if pr.id is null then raise exception 'Richiesta non trovata'; end if;
  update public.proposals set status = p_status, reply = left(coalesce(p_reply,''), 500),
         decided_at = case when p_status = 'pending' then null else now() end where id = p_id;
  delete from public.approved_items where proposal_id = p_id;
  if p_status = 'approved' then
    insert into public.approved_items(proposal_id, staff_id, day, kind, hours)
    select p_id, pr.staff_id, (x ->> 'd')::date, x ->> 'k', coalesce(x ->> 'h','') from jsonb_array_elements(pr.items) x;
  end if;
end $$;

-- ---------- pubblicazione dei turni (dal file esportato dalla pagina 2.0) ----------
create or replace function public.publish_schedule(p_people jsonb, p_cats jsonb, p_weeks jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare w jsonb; k text; v jsonb; nw int := 0; np int := 0; sid uuid;
begin
  if not public.is_titolare() then raise exception 'Solo il titolare della programmazione può pubblicare'; end if;
  insert into public.app_state(key, value) values ('cats', coalesce(p_cats,'[]'::jsonb))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into public.app_state(key, value) values ('people', coalesce(p_people,'{}'::jsonb))
    on conflict (key) do update set value = excluded.value, updated_at = now();

  for k, v in select * from jsonb_each(coalesce(p_people,'{}'::jsonb)) loop
    if exists (select 1 from public.staff where person_key = k) then
      update public.staff set name = coalesce(nullif(v ->> 'n',''), name),
             category = case when v ->> 'c' in ('chirurghi','specializzandi','datamanager') then v ->> 'c' else category end
       where person_key = k;
      continue;
    end if;
    select id into sid from public.staff
      where person_key is null and lower(name) = lower(v ->> 'n') limit 1;
    if sid is not null then
      update public.staff set person_key = k where id = sid;
    else
      insert into public.staff(name, category, person_key)
      values (v ->> 'n', case when v ->> 'c' in ('chirurghi','specializzandi','datamanager') then v ->> 'c' else 'chirurghi' end, k);
      np := np + 1;
    end if;
  end loop;

  for w in select * from jsonb_array_elements(coalesce(p_weeks,'[]'::jsonb)) loop
    insert into public.weeks(mon, data, version, published_at)
    values ((w ->> 'mon')::date, w, coalesce((w ->> 'v')::int, 1), coalesce((w ->> 'at')::timestamptz, now()))
    on conflict (mon) do update set data = excluded.data, version = excluded.version, published_at = excluded.published_at;
    nw := nw + 1;
  end loop;
  return jsonb_build_object('weeks', nw, 'new_people', np);
end $$;

-- ---------- Master SalaOp: indica chi sta in sala ----------
create or replace function public.set_or_assignment(p_day date, p_room text, p_staff uuid, p_role text, p_note text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); tgt public.staff%rowtype; rid uuid; r text := left(trim(coalesce(p_room,'')), 40);
begin
  if not public.is_salaop() then raise exception 'Solo il Master SalaOp può inserire suggerimenti di sala'; end if;
  if p_role not in ('primo','aiuto') then raise exception 'Ruolo non valido'; end if;
  if r = '' then raise exception 'Scegli la sala'; end if;
  if p_day is null or p_day < current_date - 14 or p_day > current_date + 366 then raise exception 'Data non valida'; end if;
  select * into tgt from public.staff where id = p_staff and active;
  if tgt.id is null or tgt.category not in ('chirurghi','specializzandi') then raise exception 'Si possono indicare solo chirurghi e specializzandi'; end if;
  insert into public.or_assignments(day, room, staff_id, role, note, set_by, updated_at)
  values (p_day, r, p_staff, p_role, left(coalesce(p_note,''), 200), me, now())
  on conflict (day, staff_id) do update set room = excluded.room, role = excluded.role, note = excluded.note, set_by = excluded.set_by, updated_at = now()
  returning id into rid;
  return rid;
end $$;

-- schermata semplice del Master: per un giorno e una sala indica il primo e/o il secondo operatore (solo chirurghi).
-- Sostituisce quanto indicato prima per quella sala e quel giorno; chi era in un'altra sala lo stesso giorno viene spostato.
create or replace function public.set_or_room(p_day date, p_room text, p_primo uuid default null, p_secondo uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); r text := left(trim(coalesce(p_room,'')), 40); n int := 0; x uuid; adm boolean := public.is_admin();
begin
  if not (public.is_salaop() or adm) then raise exception 'Solo il Master SalaOp o l''amministratore possono indicare le sale'; end if;
  if r = '' then raise exception 'Scegli la sala'; end if;
  if p_day is null or p_day > current_date + 366 or p_day < current_date - (case when adm then 800 else 14 end) then raise exception 'Data non valida'; end if;
  if p_primo is not null and p_primo = p_secondo then raise exception 'Primo e secondo operatore devono essere persone diverse'; end if;
  foreach x in array array[p_primo, p_secondo] loop
    if x is not null and not exists (select 1 from public.staff where id = x and active and category = 'chirurghi') then
      raise exception 'Si possono indicare solo chirurghi';
    end if;
  end loop;
  -- toglie chi era in questa sala e non è più indicato
  delete from public.or_assignments where day = p_day and room = r and staff_id is distinct from p_primo and staff_id is distinct from p_secondo;
  -- inserisce o aggiorna (chi era in un'altra sala lo stesso giorno viene spostato); se non cambia nulla non scrive e non registra
  if p_primo is not null then
    insert into public.or_assignments(day, room, staff_id, role, set_by) values (p_day, r, p_primo, 'primo', me)
    on conflict (day, staff_id) do update set room = excluded.room, role = excluded.role, set_by = excluded.set_by, updated_at = now()
      where (public.or_assignments.room, public.or_assignments.role) is distinct from (excluded.room, excluded.role);
    n := n + 1;
  end if;
  if p_secondo is not null then
    insert into public.or_assignments(day, room, staff_id, role, set_by) values (p_day, r, p_secondo, 'aiuto', me)
    on conflict (day, staff_id) do update set room = excluded.room, role = excluded.role, set_by = excluded.set_by, updated_at = now()
      where (public.or_assignments.room, public.or_assignments.role) is distinct from (excluded.room, excluded.role);
    n := n + 1;
  end if;
  return n;
end $$;

-- ---------- registro delle modifiche alle sale operatorie ----------
-- Ogni inserimento, cambio o rimozione di un'indicazione (fatta dal Master SalaOp o corretta dall'amministratore) lascia una riga che non si cancella.
-- Nome della persona e di chi ha agito sono copiati nella riga, così il registro resta leggibile anche se il personale cambia.
create table if not exists public.or_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      uuid,
  actor_name text not null default '',
  by_admin   boolean not null default false,
  act        text not null check (act in ('inserita','modificata','rimossa')),
  day        date not null,
  staff_id   uuid,
  staff_name text not null default '',
  old_room   text, old_role text,
  new_room   text, new_role text
);
create index if not exists or_log_day_idx on public.or_log(day);
create index if not exists or_log_at_idx on public.or_log(at desc);

create or replace function public.or_assignments_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); sid uuid; sname text; aname text; ac text; d date;
begin
  if tg_op = 'UPDATE' and (new.room, new.role) is not distinct from (old.room, old.role) then return new; end if;
  sid := coalesce(new.staff_id, old.staff_id); d := coalesce(new.day, old.day);
  select name into sname from public.staff where id = sid;
  select name into aname from public.staff where id = me;
  ac := case tg_op when 'INSERT' then 'inserita' when 'UPDATE' then 'modificata' else 'rimossa' end;
  insert into public.or_log(actor, actor_name, by_admin, act, day, staff_id, staff_name, old_room, old_role, new_room, new_role)
  values (me, coalesce(aname,''), coalesce(public.is_admin(), false), ac, d, sid, coalesce(sname,''),
          case when tg_op <> 'INSERT' then old.room end, case when tg_op <> 'INSERT' then old.role end,
          case when tg_op <> 'DELETE' then new.room end, case when tg_op <> 'DELETE' then new.role end);
  return coalesce(new, old);
end $$;
drop trigger if exists or_assignments_log_trg on public.or_assignments;
create trigger or_assignments_log_trg after insert or update or delete on public.or_assignments
  for each row execute function public.or_assignments_log();

-- le indicazioni già presenti quando nasce il registro vengono riportate come "inserite" (con data e autore noti)
insert into public.or_log(at, actor, actor_name, by_admin, act, day, staff_id, staff_name, new_room, new_role)
select o.updated_at, o.set_by, coalesce(a.name,''), coalesce(a.is_admin,false), 'inserita', o.day, o.staff_id, coalesce(t.name,''), o.room, o.role
from public.or_assignments o left join public.staff a on a.id = o.set_by left join public.staff t on t.id = o.staff_id
where not exists (select 1 from public.or_log);

alter table public.or_log enable row level security;
drop policy if exists orlog_sel on public.or_log;
create policy orlog_sel on public.or_log for select to authenticated using (public.is_admin());
revoke all on public.or_log from anon, public;
grant select on public.or_log to authenticated;

-- ---------- Programmazione dall'app: il titolare corregge una settimana già pubblicata ----------
-- La settimana resta marcata "src":"app": la console sul computer avvisa prima di sovrascriverla con una pubblicazione.
create or replace function public.save_week_app(p_mon date, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v int; k text; nd jsonb; ts timestamptz := now(); old jsonb;
begin
  if not public.is_titolare() then raise exception 'Solo il titolare della programmazione può modificare i turni'; end if;
  if p_mon is null or extract(isodow from p_mon) <> 1 then raise exception 'La settimana deve iniziare di lunedì'; end if;
  if p_mon < current_date - 400 or p_mon > current_date + 400 then raise exception 'Settimana non valida'; end if;
  if jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data -> 'days') <> 'object' or jsonb_typeof(p_data -> 'order') <> 'array' then raise exception 'Dati della settimana non validi'; end if;
  select data, version into old, v from public.weeks where mon = p_mon;
  if old is null then
    -- settimana non ancora pubblicata: la crea l'app (versione 1)
    nd := p_data || jsonb_build_object('mon', p_mon::text, 'v', 1, 'at', ts, 'src', 'app');
    insert into public.weeks(mon, data, version, published_at) values (p_mon, nd, 1, ts)
    on conflict (mon) do nothing;
    if not found then raise exception 'Questa settimana è stata pubblicata nel frattempo: ricarica e riprova'; end if;
    return jsonb_build_object('v', 1, 'at', ts, 'created', true);
  end if;
  nd := p_data || jsonb_build_object('mon', p_mon::text, 'v', coalesce(v, 0) + 1, 'at', ts, 'src', 'app');
  update public.weeks set data = nd, version = coalesce(v, 0) + 1, published_at = ts where mon = p_mon;
  return jsonb_build_object('v', coalesce(v, 0) + 1, 'at', ts);
end $$;

-- ---------- Notifiche: regole (orari e giorni) e preferenze personali ----------
-- registro degli invii della funzione "reminder": una riga per notifica e per periodo (evita i doppioni)
create table if not exists public.notif_log (
  kind    text not null,
  period  text not null,
  sent_at timestamptz not null default now(),
  n       integer not null default 0,
  primary key (kind, period)
);
alter table public.notif_log enable row level security;
revoke all on public.notif_log from anon, authenticated, public;

create or replace function public.notif_rules_default() returns jsonb
language sql immutable as $$
  select '{"turni_giorno":{"on":true,"time":"07:45","days":[1,2,3,4,5]},
           "desiderata":{"on":true,"dow":1,"time":"20:00","deadline_dow":2,"deadline_time":"18:00"},
           "sala":{"on":true,"dow":4,"time":"12:00"},
           "solventi":{"on":true,"dom":20,"time":"12:00"}}'::jsonb
$$;

-- il titolare cambia orari e giorni; i valori vengono controllati e completati con quelli predefiniti.
-- La notifica dei desiderata resta sempre attiva (si cambiano solo giorno e ora).
create or replace function public.set_notif_rules(p_rules jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d jsonb := public.notif_rules_default(); r jsonb := coalesce(p_rules, '{}'::jsonb); k text; x jsonb; o jsonb := '{}'::jsonb; t text; n int; arr jsonb;
begin
  if not public.is_titolare() then raise exception 'Solo il titolare della programmazione può cambiare le regole delle notifiche'; end if;
  foreach k in array array['turni_giorno','desiderata','sala','solventi'] loop
    x := d -> k || coalesce(r -> k, '{}'::jsonb);
    t := x ->> 'time';
    if t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Orario non valido (usa ore:minuti, per esempio 07:45)'; end if;
    if k = 'desiderata' then
      x := x || '{"on":true}'::jsonb;
      if (x ->> 'dow') !~ '^[1-7]$' or (x ->> 'deadline_dow') !~ '^[1-7]$' then raise exception 'Giorno della settimana non valido'; end if;
      if (x ->> 'deadline_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Orario di scadenza non valido'; end if;
    else
      if jsonb_typeof(x -> 'on') <> 'boolean' then raise exception 'Valore on/off non valido'; end if;
    end if;
    if k = 'turni_giorno' then
      arr := x -> 'days';
      if jsonb_typeof(arr) <> 'array' or jsonb_array_length(arr) = 0 or exists (select 1 from jsonb_array_elements_text(arr) e where e !~ '^[1-7]$') then raise exception 'Scegli almeno un giorno della settimana'; end if;
      x := x || jsonb_build_object('days', (select jsonb_agg(distinct e::int order by e::int) from jsonb_array_elements_text(arr) e));
    elsif k = 'sala' then
      if (x ->> 'dow') !~ '^[1-7]$' then raise exception 'Giorno della settimana non valido'; end if;
    elsif k = 'solventi' then
      if (x ->> 'dom') !~ '^[0-9]{1,2}$' or (x ->> 'dom')::int not between 1 and 28 then raise exception 'Il giorno del mese deve essere tra 1 e 28'; end if;
    end if;
    o := o || jsonb_build_object(k, x);
  end loop;
  insert into public.app_state(key, value, updated_at) values ('notif_rules', o, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return o;
end $$;

-- ognuno accende o spegne le proprie notifiche facoltative (non quella dei desiderata)
create or replace function public.set_notif_pref(p_kind text, p_on boolean) returns text[]
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); res text[];
begin
  if me is null then raise exception 'Accesso non valido'; end if;
  if p_kind = 'desiderata' then raise exception 'Questa notifica è obbligatoria e non si può disattivare'; end if;
  if p_kind not in ('turni_giorno','sala','solventi') then raise exception 'Notifica sconosciuta'; end if;
  update public.staff set notif_off = case when p_on then array_remove(notif_off, p_kind)
                                           else (select array_agg(distinct e) from unnest(array_append(notif_off, p_kind)) e) end
  where id = me returning notif_off into res;
  return coalesce(res, '{}');
end $$;

-- ---------- Solventi AG: assegnazioni (secondo e terzo operatore, ARTI / RPS), una per giorno ----------
create table if not exists public.solv_assignments (
  id         uuid primary key default gen_random_uuid(),
  day        date not null unique,
  secondo    uuid references public.staff(id) on delete set null,
  terzo      uuid references public.staff(id) on delete set null,
  kind       text check (kind in ('ARTI','RPS')),
  set_by     uuid references public.staff(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.solv_assignments enable row level security;
drop policy if exists solvsel on public.solv_assignments;
create policy solvsel on public.solv_assignments for select to authenticated using (public.is_solvag());
revoke all on public.solv_assignments from anon, public;
grant select on public.solv_assignments to authenticated;   -- le scritture passano da set_solv_day

create or replace function public.set_solv_day(p_day date, p_secondo uuid default null, p_terzo uuid default null, p_kind text default null) returns integer
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); k text := nullif(upper(trim(coalesce(p_kind,''))), ''); x uuid;
begin
  if not public.is_solvag() then raise exception 'Solo chi ha il profilo Solventi AG'; end if;
  if p_day is null or p_day < current_date - 800 or p_day > current_date + 366 then raise exception 'Data non valida'; end if;
  if k is not null and k not in ('ARTI','RPS') then raise exception 'Tipologia non valida (ARTI o RPS)'; end if;
  if p_secondo is not null and p_secondo = p_terzo then raise exception 'Secondo e terzo operatore devono essere persone diverse'; end if;
  foreach x in array array[p_secondo, p_terzo] loop
    if x is not null and not exists (select 1 from public.staff where id = x and active and category = 'chirurghi') then
      raise exception 'Si possono indicare solo chirurghi';
    end if;
  end loop;
  if p_secondo is null and p_terzo is null then
    delete from public.solv_assignments where day = p_day; return 0;
  end if;
  insert into public.solv_assignments(day, secondo, terzo, kind, set_by) values (p_day, p_secondo, p_terzo, k, me)
  on conflict (day) do update set secondo = excluded.secondo, terzo = excluded.terzo, kind = excluded.kind, set_by = excluded.set_by, updated_at = now();
  return 1;
end $$;

create or replace function public.save_push(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id();
begin
  if me is null then raise exception 'Accesso non autorizzato'; end if;
  if coalesce(p_endpoint,'') = '' or length(p_endpoint) > 1000 or coalesce(p_p256dh,'') = '' or coalesce(p_auth,'') = '' then raise exception 'Dati non validi'; end if;
  insert into public.push_subs(endpoint, staff_id, p256dh, auth) values (p_endpoint, me, p_p256dh, p_auth)
  on conflict (endpoint) do update set staff_id = me, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

create or replace function public.drop_push(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_subs where endpoint = p_endpoint and staff_id = public.my_staff_id();
end $$;

create or replace function public.clear_or_assignment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_salaop() or public.is_admin()) then raise exception 'Solo il Master SalaOp o l''amministratore'; end if;
  delete from public.or_assignments where id = p_id;
end $$;

-- il titolare può passare il ruolo a un altro amministratore; ogni amministratore può prenderlo per sé (es. titolare assente)
create or replace function public.set_titolare(p_staff uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id(); cur uuid := public.titolare_id(); tgt uuid; nm_old text; nm_new text;
begin
  if not public.is_admin() then raise exception 'Solo un amministratore'; end if;
  tgt := coalesce(p_staff, me);
  if not exists (select 1 from public.staff where id = tgt and active and is_admin) then
    raise exception 'La persona scelta non è un amministratore attivo';
  end if;
  if tgt <> me and me <> cur then
    raise exception 'Solo il titolare può passare la titolarità; puoi però assumerla tu';
  end if;
  if tgt = cur then return jsonb_build_object('staff_id', tgt, 'changed', false); end if;
  select name into nm_old from public.staff where id = cur;
  select name into nm_new from public.staff where id = tgt;
  insert into public.app_state(key, value) values ('titolare', jsonb_build_object('staff_id', tgt, 'since', now(), 'by', me))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.notify_admin('Cambio di titolare', nm_new || ' è ora titolare della programmazione (prima: ' || coalesce(nm_old,'—') || ').');
  return jsonb_build_object('staff_id', tgt, 'changed', true);
end $$;

create or replace function public.send_test_notification() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''amministratore'; end if;
  perform public.notify_admin('Prova notifica', 'Se vedi questo messaggio le notifiche funzionano.');
end $$;


-- ---------- versione dell'app usata da ciascuno + stato delle notifiche (solo per gli amministratori) ----------
alter table public.staff add column if not exists app_version text;
alter table public.staff add column if not exists app_seen timestamptz;

-- l'app comunica la propria versione a ogni apertura (solo la propria riga)
create or replace function public.report_app_version(p_version text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := public.my_staff_id();
begin
  if me is null then return; end if;
  update public.staff set app_version = left(coalesce(p_version,''), 20), app_seen = now() where id = me;
end $$;

-- elenco per la console: chi usa quale versione e chi ha attivato le notifiche sul telefono
create or replace function public.staff_app_status() returns table(id uuid, name text, category text, active boolean, app_version text, app_seen timestamptz, n_push integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo gli amministratori'; end if;
  return query
    select s.id, s.name, s.category, s.active, s.app_version, s.app_seen,
           (select count(*)::int from public.push_subs p where p.staff_id = s.id)
    from public.staff s order by s.active desc, s.category, s.name;
end $$;

-- ---------- chi può chiamare cosa ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.email_allowed(text) to anon, authenticated;
grant execute on function public.auth_email(), public.my_staff_id(), public.is_admin(), public.is_salaop(), public.is_solvag(), public.is_titolare(), public.titolare_id(), public.whoami(), public.directory(),
      public.set_titolare(uuid),
      public.set_or_assignment(date, text, uuid, text, text), public.set_or_room(date, text, uuid, uuid), public.set_solv_day(date, uuid, uuid, text), public.set_notif_rules(jsonb), public.set_notif_pref(text, boolean), public.save_push(text, text, text), public.drop_push(text), public.clear_or_assignment(uuid),
      public.submit_proposal(jsonb, text, uuid), public.is_pa(), public.pa_target(), public.decide_proposal(uuid, text, text),
      public.publish_schedule(jsonb, jsonb, jsonb), public.save_week_app(date, jsonb), public.send_test_notification(), public.report_app_version(text), public.staff_app_status() to authenticated;

-- ---------- primo amministratore (Marco) ----------
insert into public.staff(name, emails, category, is_admin)
select 'Fiore', array['marco.fiore@istitutotumori.mi.it'], 'chirurghi', true
where not exists (select 1 from public.staff where is_admin);
