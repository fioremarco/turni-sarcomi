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
  category    text not null check (category in ('chirurghi','specializzandi','datamanager','segreteria')),
  person_key  text,                                    -- identificativo nel calendario dei turni
  is_admin    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.app_state (          -- dati generali: elenco categorie, persone, notifiche
  key    text primary key,
  value  jsonb not null,
  updated_at timestamptz not null default now()
);

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

-- risponde (anche a chi non ha ancora fatto l'accesso) se una email è nell'elenco del personale
create or replace function public.email_allowed(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where active and lower(trim(p_email)) = any(emails))
$$;

create or replace function public.whoami() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) from (
    select id, name, category, person_key, is_admin from public.staff where id = public.my_staff_id()
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

-- ---------- sicurezza a livello di riga ----------
alter table public.staff          enable row level security;
alter table public.app_state      enable row level security;
alter table public.weeks          enable row level security;
alter table public.proposals      enable row level security;
alter table public.approved_items enable row level security;
alter table public.kv             enable row level security;

drop policy if exists staff_read   on public.staff;
drop policy if exists staff_admin  on public.staff;
create policy staff_read  on public.staff for select to authenticated using (public.is_admin() or id = public.my_staff_id());
create policy staff_admin on public.staff for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists state_read  on public.app_state;
drop policy if exists state_admin on public.app_state;
create policy state_read  on public.app_state for select to authenticated using (public.my_staff_id() is not null and (key <> 'ntfy' or public.is_admin()));
create policy state_admin on public.app_state for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists weeks_read  on public.weeks;
drop policy if exists weeks_admin on public.weeks;
create policy weeks_read  on public.weeks for select to authenticated using (public.my_staff_id() is not null);
create policy weeks_admin on public.weeks for all    to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists prop_read   on public.proposals;
drop policy if exists prop_delete on public.proposals;
create policy prop_read   on public.proposals for select to authenticated using (public.is_admin() or staff_id = public.my_staff_id());
create policy prop_delete on public.proposals for delete to authenticated using (public.is_admin() or (staff_id = public.my_staff_id() and status = 'pending'));

drop policy if exists kv_admin on public.kv;
create policy kv_admin on public.kv for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists appr_read on public.approved_items;
create policy appr_read on public.approved_items for select to authenticated using (public.my_staff_id() is not null);

-- ---------- permessi sulle tabelle ----------
revoke all on public.staff, public.app_state, public.weeks, public.proposals, public.approved_items, public.kv from anon, public;
grant select, insert, update, delete on public.kv to authenticated;   -- solo amministratore (RLS)
grant select on public.staff, public.app_state, public.weeks, public.proposals, public.approved_items to authenticated;
grant insert, update, delete on public.staff, public.app_state, public.weeks to authenticated;   -- limitati da RLS ai soli amministratori
grant delete on public.proposals to authenticated;

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
create or replace function public.submit_proposal(p_items jsonb, p_note text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me public.staff%rowtype; pid uuid; it jsonb; n int; k text; d date; h text;
  allowed text[];
begin
  select * into me from public.staff where id = public.my_staff_id();
  if me.id is null then raise exception 'Accesso non autorizzato'; end if;
  allowed := case me.category
    when 'chirurghi'       then array['ass','per']
    when 'specializzandi'  then array['ass','lez','cong']
    when 'datamanager'     then array['pres','sw','ass']
    else array[]::text[] end;
  if cardinality(allowed) = 0 then raise exception 'La segreteria non può inviare richieste'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Richiesta non valida'; end if;
  n := jsonb_array_length(p_items);
  if n < 1 or n > 31 then raise exception 'Numero di giorni non valido'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    k := it ->> 'k'; h := coalesce(it ->> 'h','');
    begin d := (it ->> 'd')::date; exception when others then raise exception 'Data non valida'; end;
    if not (k = any(allowed)) then raise exception 'Tipo di richiesta non consentito'; end if;
    if d < current_date - 1 then raise exception 'Non si può chiedere un giorno già passato'; end if;
    if k = 'per' and h = '' then raise exception 'Indica l''orario del permesso'; end if;
    if length(h) > 40 then raise exception 'Orario troppo lungo'; end if;
  end loop;

  insert into public.proposals(staff_id, items, note, status, decided_at)
  values (me.id,
          (select jsonb_agg(jsonb_build_object('d', x ->> 'd', 'k', x ->> 'k', 'h', coalesce(x ->> 'h','')) order by x ->> 'd') from jsonb_array_elements(p_items) x),
          left(coalesce(p_note,''), 500),
          case when me.is_admin then 'approved' else 'pending' end,
          case when me.is_admin then now() end)
  returning id into pid;

  if me.is_admin then
    insert into public.approved_items(proposal_id, staff_id, day, kind, hours)
    select pid, me.id, (x ->> 'd')::date, x ->> 'k', coalesce(x ->> 'h','') from jsonb_array_elements(p_items) x;
  else
    perform public.notify_admin('Nuova richiesta di turno', me.name || ' ha inviato una richiesta (' || n || ' giorn' || case when n = 1 then 'o' else 'i' end || '). Aprila per accettarla o negarla.');
  end if;
  return pid;
end $$;

-- ---------- decisione di Marco ----------
create or replace function public.decide_proposal(p_id uuid, p_status text, p_reply text default '') returns void
language plpgsql security definer set search_path = public as $$
declare pr public.proposals%rowtype;
begin
  if not public.is_admin() then raise exception 'Solo l''amministratore può decidere'; end if;
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
  if not public.is_admin() then raise exception 'Solo l''amministratore può pubblicare'; end if;
  insert into public.app_state(key, value) values ('cats', coalesce(p_cats,'[]'::jsonb))
    on conflict (key) do update set value = excluded.value, updated_at = now();
  insert into public.app_state(key, value) values ('people', coalesce(p_people,'{}'::jsonb))
    on conflict (key) do update set value = excluded.value, updated_at = now();

  for k, v in select * from jsonb_each(coalesce(p_people,'{}'::jsonb)) loop
    if exists (select 1 from public.staff where person_key = k) then
      update public.staff set name = coalesce(nullif(v ->> 'n',''), name),
             category = case when category = 'segreteria' then category
                             when v ->> 'c' in ('chirurghi','specializzandi','datamanager') then v ->> 'c' else category end
       where person_key = k;
      continue;
    end if;
    select id into sid from public.staff
      where person_key is null and lower(name) = lower(v ->> 'n') limit 1;
    if sid is not null then
      update public.staff set person_key = k where id = sid;
    else
      insert into public.staff(name, category, person_key)
      values (v ->> 'n', case when v ->> 'c' in ('chirurghi','specializzandi','datamanager','segreteria') then v ->> 'c' else 'chirurghi' end, k);
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

create or replace function public.send_test_notification() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo l''amministratore'; end if;
  perform public.notify_admin('Prova notifica', 'Se vedi questo messaggio le notifiche funzionano.');
end $$;

-- ---------- chi può chiamare cosa ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.email_allowed(text) to anon, authenticated;
grant execute on function public.auth_email(), public.my_staff_id(), public.is_admin(), public.whoami(), public.directory(),
      public.submit_proposal(jsonb, text), public.decide_proposal(uuid, text, text),
      public.publish_schedule(jsonb, jsonb, jsonb), public.send_test_notification() to authenticated;

-- ---------- primo amministratore (Marco) ----------
insert into public.staff(name, emails, category, is_admin)
select 'Fiore', array['marco.fiore@istitutotumori.mi.it'], 'chirurghi', true
where not exists (select 1 from public.staff where is_admin);
