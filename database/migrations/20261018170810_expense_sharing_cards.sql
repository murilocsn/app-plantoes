-- Independent expense cards: no changes to legacy spaces, memberships or policies.
begin;

create schema if not exists expense_sharing_private;
revoke all on schema expense_sharing_private from public, anon;
grant usage on schema expense_sharing_private to authenticated;

create table public.shared_expense_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (length(btrim(description)) between 2 and 200),
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  category text check (length(category) <= 80),
  notes text check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);
create index shared_expense_cards_owner_date on public.shared_expense_cards(owner_id, expense_date);

create table public.shared_expense_invitations (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.shared_expense_cards(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_email text not null check (length(invited_email) between 3 and 254),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (invited_by <> invited_user_id)
);
create unique index shared_expense_invitations_active_recipient
  on public.shared_expense_invitations(card_id, invited_user_id) where status in ('pending','accepted');
create index shared_expense_invitations_recipient on public.shared_expense_invitations(invited_user_id, status, created_at);
create index shared_expense_invitations_sender on public.shared_expense_invitations(invited_by, created_at);
create index shared_expense_invitations_card on public.shared_expense_invitations(card_id);

alter table public.shared_expense_cards enable row level security;
alter table public.shared_expense_invitations enable row level security;
revoke all on public.shared_expense_cards, public.shared_expense_invitations from public, anon, authenticated;
grant select on public.shared_expense_cards, public.shared_expense_invitations to authenticated;

create policy shared_expense_invitations_read on public.shared_expense_invitations
  for select to authenticated using (invited_by = (select auth.uid()) or invited_user_id = (select auth.uid()));
create policy shared_expense_cards_read on public.shared_expense_cards
  for select to authenticated using (owner_id = (select auth.uid()) or exists (
    select 1 from public.shared_expense_invitations i where i.card_id = shared_expense_cards.id
      and i.invited_user_id = (select auth.uid()) and i.status = 'accepted'
  ));

-- Definer functions live in a non-exposed schema and validate auth.uid() on
-- every path. Public invoker wrappers are the only Data API entry points.
create function expense_sharing_private.create_card(
  p_description text, p_amount numeric, p_expense_date date, p_category text, p_notes text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 9999999999.99
    or p_amount <> round(p_amount,2) or p_expense_date is null
    or p_description is null or length(btrim(p_description)) not between 2 and 200
    or length(p_category) > 80 or length(p_notes) > 2000 then
    raise invalid_parameter_value;
  end if;
  insert into public.shared_expense_cards(owner_id,description,amount,expense_date,category,notes)
    values(v_uid,btrim(p_description),p_amount,p_expense_date,nullif(btrim(p_category),''),nullif(btrim(p_notes),''))
    returning id into v_id;
  return v_id;
end $$;

create function expense_sharing_private.invite(p_card_id uuid,p_email text,p_amount numeric)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_card public.shared_expense_cards%rowtype;
  v_recipient uuid; v_reserved numeric; v_id uuid; v_email text := lower(btrim(p_email));
begin
  if v_uid is null then raise insufficient_privilege; end if;
  -- Serialize per sender as well as per card, including the daily invite limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text, 61842));
  select * into v_card from public.shared_expense_cards where id=p_card_id for update;
  if not found then raise no_data_found; end if;
  if v_card.owner_id <> v_uid then raise insufficient_privilege; end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount,2)
    or v_email is null or length(v_email) not between 3 and 254 then raise invalid_parameter_value; end if;
  select id into v_recipient from auth.users where lower(email)=v_email and email_confirmed_at is not null;
  if v_recipient is null or v_recipient=v_uid then raise invalid_parameter_value; end if;
  if exists(select 1 from public.shared_expense_invitations where card_id=p_card_id
    and invited_user_id=v_recipient and status in ('pending','accepted')) then raise unique_violation; end if;
  if (select count(*) from public.shared_expense_invitations where invited_by=v_uid
      and created_at > now() - interval '1 day') >= 50 then
    raise program_limit_exceeded;
  end if;
  select coalesce(sum(amount),0) into v_reserved from public.shared_expense_invitations
    where card_id=p_card_id and status in ('pending','accepted');
  if v_reserved+p_amount > v_card.amount then raise invalid_parameter_value; end if;
  insert into public.shared_expense_invitations(card_id,invited_by,invited_user_id,invited_email,amount)
    values(p_card_id,v_uid,v_recipient,v_email,p_amount) returning id into v_id;
  return v_id;
end $$;

create function expense_sharing_private.respond(p_invitation_id uuid,p_action text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_card_id uuid; v_invite public.shared_expense_invitations%rowtype;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  if p_action is null or p_action not in ('accepted','declined') then raise invalid_parameter_value; end if;
  select card_id into v_card_id from public.shared_expense_invitations
    where id=p_invitation_id and invited_user_id=v_uid;
  if not found then raise no_data_found; end if;
  perform 1 from public.shared_expense_cards where id=v_card_id for update;
  select * into v_invite from public.shared_expense_invitations where id=p_invitation_id for update;
  if v_invite.invited_user_id <> v_uid then raise insufficient_privilege; end if;
  if v_invite.status=p_action then return p_invitation_id; end if;
  if v_invite.status<>'pending' then raise exception using errcode='P0001'; end if;
  update public.shared_expense_invitations set status=p_action,responded_at=now() where id=p_invitation_id;
  return p_invitation_id;
end $$;

create function expense_sharing_private.cancel(p_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_card_id uuid; v_invite public.shared_expense_invitations%rowtype;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  select card_id into v_card_id from public.shared_expense_invitations where id=p_invitation_id and invited_by=v_uid;
  if not found then raise no_data_found; end if;
  perform 1 from public.shared_expense_cards where id=v_card_id and owner_id=v_uid for update;
  if not found then raise insufficient_privilege; end if;
  select * into v_invite from public.shared_expense_invitations where id=p_invitation_id for update;
  if v_invite.status='cancelled' then return p_invitation_id; end if;
  if v_invite.status<>'pending' then raise exception using errcode='P0001'; end if;
  update public.shared_expense_invitations set status='cancelled',responded_at=now() where id=p_invitation_id;
  return p_invitation_id;
end $$;

create function expense_sharing_private.snapshot()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_cards jsonb; v_invitations jsonb;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  select coalesce(jsonb_agg(item order by item->>'expense_date' desc,item->>'id'),'[]'::jsonb) into v_cards from (
    select jsonb_build_object(
      'id',c.id,'owner_id',c.owner_id,'owner_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app'),
      'description',c.description,'expense_date',c.expense_date,'category',c.category,'notes',c.notes,'created_at',c.created_at,
      'total_amount',c.amount,'is_owner',c.owner_id=v_uid,
      'amount',case when c.owner_id=v_uid then c.amount-coalesce((select sum(i.amount)
        from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),0)
        else (select i.amount from public.shared_expense_invitations i where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted') end,
      'participant_count',1+(select count(*) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),
      'invitations',case when c.owner_id=v_uid then coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at
      ) order by i.created_at,i.id) from public.shared_expense_invitations i where i.card_id=c.id),'[]'::jsonb) else '[]'::jsonb end
    ) as item from public.shared_expense_cards c join auth.users u on u.id=c.owner_id
    where c.owner_id=v_uid or exists(select 1 from public.shared_expense_invitations i
      where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted')
  ) cards;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at,
    'description',c.description,'expense_date',c.expense_date,'total_amount',c.amount,
    'owner_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app')
  ) order by i.created_at desc,i.id),'[]'::jsonb) into v_invitations
    from public.shared_expense_invitations i join public.shared_expense_cards c on c.id=i.card_id
    join auth.users u on u.id=c.owner_id where i.invited_user_id=v_uid and i.status='pending';
  return jsonb_build_object('cards',v_cards,'invitations',v_invitations);
end $$;

create function public.expense_sharing_create(p_description text,p_amount numeric,p_expense_date date,p_category text default null,p_notes text default null)
returns uuid language sql security invoker set search_path='' as $$
  select expense_sharing_private.create_card(p_description,p_amount,p_expense_date,p_category,p_notes);
$$;
create function public.expense_sharing_invite(p_card_id uuid,p_email text,p_amount numeric)
returns uuid language sql security invoker set search_path='' as $$
  select expense_sharing_private.invite(p_card_id,p_email,p_amount);
$$;
create function public.expense_sharing_respond(p_invitation_id uuid,p_action text)
returns uuid language sql security invoker set search_path='' as $$
  select expense_sharing_private.respond(p_invitation_id,p_action);
$$;
create function public.expense_sharing_cancel(p_invitation_id uuid)
returns uuid language sql security invoker set search_path='' as $$
  select expense_sharing_private.cancel(p_invitation_id);
$$;
create function public.expense_sharing_snapshot()
returns jsonb language sql security invoker set search_path='' as $$ select expense_sharing_private.snapshot(); $$;

revoke all on all functions in schema expense_sharing_private from public,anon;
grant execute on all functions in schema expense_sharing_private to authenticated;
revoke all on function public.expense_sharing_create(text,numeric,date,text,text),
  public.expense_sharing_invite(uuid,text,numeric),public.expense_sharing_respond(uuid,text),
  public.expense_sharing_cancel(uuid),public.expense_sharing_snapshot() from public,anon;
grant execute on function public.expense_sharing_create(text,numeric,date,text,text),
  public.expense_sharing_invite(uuid,text,numeric),public.expense_sharing_respond(uuid,text),
  public.expense_sharing_cancel(uuid),public.expense_sharing_snapshot() to authenticated;

notify pgrst, 'reload schema';
commit;
