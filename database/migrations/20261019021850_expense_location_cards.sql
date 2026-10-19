-- Reuse expense cards as location containers; legacy cards and allocations stay intact.
-- Review locally and apply separately. This file does not alter shifts, spaces or LGPD.
begin;

alter table public.shared_expense_cards
  add column card_kind text not null default 'expense' check (card_kind in ('expense','location')),
  add column visibility text not null default 'shared' check (visibility in ('personal','shared')),
  add column location_card_id uuid references public.shared_expense_cards(id),
  add column expense_split jsonb;
alter table public.shared_expense_cards drop constraint shared_expense_cards_amount_check;
alter table public.shared_expense_cards add constraint shared_expense_cards_structure_check check (
  (card_kind='location' and amount=0 and location_card_id is null and expense_split is null)
  or (card_kind='expense' and amount>0 and visibility='shared' and (
    (location_card_id is null and expense_split is null)
    or (location_card_id is not null and expense_split is not null and jsonb_typeof(expense_split)='object')
  ))
);
create index shared_expense_cards_location_date on public.shared_expense_cards(location_card_id,expense_date)
  where location_card_id is not null;
alter table public.shared_expense_invitations drop constraint shared_expense_invitations_amount_check;
alter table public.shared_expense_invitations add constraint shared_expense_invitations_amount_check check (amount>=0);
alter table public.personal_expenses add column location_card_id uuid references public.shared_expense_cards(id);
create index personal_expenses_location_date on public.personal_expenses(user_id,location_card_id,expense_date)
  where location_card_id is not null;

create function expense_sharing_private.can_read_location(p_card_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.shared_expense_cards c where c.id=p_card_id and c.card_kind='location'
      and (c.owner_id=auth.uid() or (c.visibility='shared' and exists (
        select 1 from public.shared_expense_invitations i where i.card_id=c.id
          and i.invited_user_id=auth.uid() and i.status='accepted'
      )))
  );
$$;
-- Preserve owner/accepted access in one policy and include accepted location members.
alter policy shared_expense_cards_read on public.shared_expense_cards using (
  owner_id=(select auth.uid()) or exists (
    select 1 from public.shared_expense_invitations i where i.card_id=shared_expense_cards.id
      and i.invited_user_id=(select auth.uid()) and i.status='accepted'
  ) or (location_card_id is not null and expense_sharing_private.can_read_location(location_card_id))
);

-- Check relationships even for direct Data API inserts into personal_expenses.
create function expense_sharing_private.check_personal_location()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.location_card_id is not null and not exists (
    select 1 from public.shared_expense_cards c where c.id=new.location_card_id
      and c.card_kind='location' and c.visibility='personal' and c.owner_id=new.user_id
  ) then raise insufficient_privilege; end if;
  return new;
end $$;
create trigger personal_expense_location_check before insert or update of user_id,location_card_id
  on public.personal_expenses for each row execute function expense_sharing_private.check_personal_location();

-- Legacy invitation RPCs cannot be used to allocate money against a location or child expense.
create function expense_sharing_private.check_invitation_target()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_card public.shared_expense_cards%rowtype;
begin
  select * into v_card from public.shared_expense_cards where id=new.card_id;
  if not found or new.invited_by<>v_card.owner_id then raise insufficient_privilege; end if;
  if (v_card.card_kind='location' and (v_card.visibility<>'shared' or new.amount<>0))
    or (v_card.card_kind='expense' and (v_card.location_card_id is not null or new.amount<=0))
    then raise invalid_parameter_value; end if;
  return new;
end $$;
create trigger shared_expense_invitation_target_check
  before insert or update of card_id,amount,invited_by on public.shared_expense_invitations
  for each row execute function expense_sharing_private.check_invitation_target();

create function expense_sharing_private.create_location(p_name text,p_visibility text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 200
    or p_visibility is null or p_visibility not in ('personal','shared') then raise invalid_parameter_value; end if;
  insert into public.shared_expense_cards(owner_id,description,amount,expense_date,card_kind,visibility)
    values(v_uid,btrim(p_name),0,current_date,'location',p_visibility) returning id into v_id;
  return v_id;
end $$;

create function expense_sharing_private.rename_location(p_card_id uuid,p_name text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 200 then raise invalid_parameter_value; end if;
  update public.shared_expense_cards set description=btrim(p_name)
    where id=p_card_id and card_kind='location' and owner_id=auth.uid();
  if not found then raise insufficient_privilege; end if;
  return p_card_id;
end $$;

create function expense_sharing_private.invite_location(p_card_id uuid,p_email text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_card public.shared_expense_cards%rowtype;
  v_recipient uuid; v_id uuid; v_email text:=lower(btrim(p_email));
begin
  if v_uid is null then raise insufficient_privilege; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,61842));
  select * into v_card from public.shared_expense_cards where id=p_card_id for update;
  if not found then raise no_data_found; end if;
  if v_card.owner_id<>v_uid then raise insufficient_privilege; end if;
  if v_card.card_kind<>'location' or v_card.visibility<>'shared'
    or v_email is null or length(v_email) not between 3 and 254 then raise invalid_parameter_value; end if;
  select id into v_recipient from auth.users where lower(email)=v_email and email_confirmed_at is not null;
  -- Same error for self, missing and unconfirmed recipients; no directory lookup is exposed.
  if v_recipient is null or v_recipient=v_uid then raise invalid_parameter_value; end if;
  if exists(select 1 from public.shared_expense_invitations where card_id=p_card_id
    and invited_user_id=v_recipient and status in ('pending','accepted')) then raise unique_violation; end if;
  if (select count(*) from public.shared_expense_invitations where invited_by=v_uid
    and created_at>now()-interval '1 day')>=50 then raise program_limit_exceeded; end if;
  insert into public.shared_expense_invitations(card_id,invited_by,invited_user_id,invited_email,amount)
    values(p_card_id,v_uid,v_recipient,v_email,0) returning id into v_id;
  return v_id;
end $$;

create function expense_sharing_private.add_located_expense(
  p_card_id uuid,p_description text,p_amount numeric,p_expense_date date,p_category text,p_notes text,p_shared boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_card public.shared_expense_cards%rowtype;
  v_id uuid; v_count integer; v_cents numeric; v_split jsonb;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  if p_shared is null or p_amount is null or p_amount<0 or p_amount>9999999999.99
    or p_amount<>round(p_amount,2) or (p_shared and p_amount=0) or p_expense_date is null
    or p_description is null or length(btrim(p_description)) not between 2 and 200
    or length(p_category)>80 or length(p_notes)>2000 then raise invalid_parameter_value; end if;
  -- The same parent lock is used by respond/cancel/invite, so splits cannot race with acceptance.
  select * into v_card from public.shared_expense_cards where id=p_card_id and card_kind='location' for update;
  if not found then raise no_data_found; end if;
  if p_shared then
    if v_card.visibility<>'shared' or not expense_sharing_private.can_read_location(p_card_id)
      then raise insufficient_privilege; end if;
    select 1+count(*) into v_count from public.shared_expense_invitations where card_id=p_card_id and status='accepted';
    v_cents:=p_amount*100;
    select jsonb_object_agg(member_id::text,(floor(v_cents/v_count)+case when member_id=v_card.owner_id
      then mod(v_cents,v_count) else 0 end)/100) into v_split from (
      select v_card.owner_id as member_id union all
      select invited_user_id from public.shared_expense_invitations where card_id=p_card_id and status='accepted'
    ) members;
    insert into public.shared_expense_cards(owner_id,description,amount,expense_date,category,notes,location_card_id,expense_split)
      values(v_card.owner_id,btrim(p_description),p_amount,p_expense_date,nullif(btrim(p_category),''),nullif(btrim(p_notes),''),p_card_id,v_split)
      returning id into v_id;
  else
    if v_card.visibility<>'personal' or v_card.owner_id<>v_uid then raise insufficient_privilege; end if;
    insert into public.personal_expenses(user_id,description,amount,expense_date,category,notes,location_card_id)
      values(v_uid,btrim(p_description),p_amount,p_expense_date,nullif(btrim(p_category),''),nullif(btrim(p_notes),''),p_card_id)
      returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function expense_sharing_private.snapshot()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_cards jsonb; v_invitations jsonb; v_locations jsonb; v_personal jsonb;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  select coalesce(jsonb_agg(item order by item->>'expense_date' desc,item->>'id'),'[]'::jsonb) into v_cards from (
    select jsonb_build_object(
      'id',c.id,'owner_id',c.owner_id,'owner_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app'),
      'description',c.description,'expense_date',c.expense_date,'category',c.category,'notes',c.notes,'created_at',c.created_at,
      'location_card_id',c.location_card_id,'total_amount',c.amount,'is_owner',c.owner_id=v_uid,
      'amount',case when c.location_card_id is not null then coalesce((c.expense_split->>v_uid::text)::numeric,0)
        when c.owner_id=v_uid then c.amount-coalesce((select sum(i.amount) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),0)
        else (select i.amount from public.shared_expense_invitations i where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted') end,
      'participant_count',case when c.location_card_id is not null then (select count(*) from jsonb_object_keys(c.expense_split))
        else 1+(select count(*) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted') end,
      'invitations',case when c.location_card_id is null and c.owner_id=v_uid then coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at
      ) order by i.created_at,i.id) from public.shared_expense_invitations i where i.card_id=c.id),'[]'::jsonb) else '[]'::jsonb end
    ) as item from public.shared_expense_cards c join auth.users u on u.id=c.owner_id
    where c.card_kind='expense' and (
      (c.location_card_id is null and (c.owner_id=v_uid or exists(select 1 from public.shared_expense_invitations i
        where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted')))
      or (c.location_card_id is not null and expense_sharing_private.can_read_location(c.location_card_id))
    )
  ) cards;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.description,'visibility',c.visibility,'is_owner',c.owner_id=v_uid,
    'owner_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app'),
    'participant_count',1+(select count(*) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),
    'participants',(select jsonb_agg(jsonb_build_object('name',member_name,'is_owner',is_owner) order by is_owner desc,member_name) from (
      select coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app') as member_name,true as is_owner
      union all select coalesce(nullif(guest.raw_user_meta_data->>'full_name',''),'Usuário do app'),false
      from public.shared_expense_invitations i join auth.users guest on guest.id=i.invited_user_id where i.card_id=c.id and i.status='accepted'
    ) members),
    'invitations',case when c.owner_id=v_uid then coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at
    ) order by i.created_at,i.id) from public.shared_expense_invitations i where i.card_id=c.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by c.description,c.id),'[]'::jsonb) into v_locations
  from public.shared_expense_cards c join auth.users u on u.id=c.owner_id
  where c.card_kind='location' and expense_sharing_private.can_read_location(c.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at,
    'description',c.description,'expense_date',c.expense_date,'total_amount',c.amount,'is_location',c.card_kind='location',
    'owner_name',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Usuário do app')
  ) order by i.created_at desc,i.id),'[]'::jsonb) into v_invitations
    from public.shared_expense_invitations i join public.shared_expense_cards c on c.id=i.card_id
    join auth.users u on u.id=c.owner_id where i.invited_user_id=v_uid and i.status='pending';
  select coalesce(jsonb_agg(jsonb_build_object('expense_id',id,'location_card_id',location_card_id)),'[]'::jsonb)
    into v_personal from public.personal_expenses where user_id=v_uid and location_card_id is not null;
  return jsonb_build_object('cards',v_cards,'locations',v_locations,'invitations',v_invitations,'personal_locations',v_personal);
end $$;

create function public.expense_location_create(p_name text,p_visibility text)
returns uuid language sql security invoker set search_path='' as $$ select expense_sharing_private.create_location(p_name,p_visibility); $$;
create function public.expense_location_rename(p_card_id uuid,p_name text)
returns uuid language sql security invoker set search_path='' as $$ select expense_sharing_private.rename_location(p_card_id,p_name); $$;
create function public.expense_location_invite(p_card_id uuid,p_email text)
returns uuid language sql security invoker set search_path='' as $$ select expense_sharing_private.invite_location(p_card_id,p_email); $$;
create function public.expense_location_add_personal(p_card_id uuid,p_description text,p_amount numeric,p_expense_date date,p_category text default null,p_notes text default null)
returns uuid language sql security invoker set search_path='' as $$ select expense_sharing_private.add_located_expense(p_card_id,p_description,p_amount,p_expense_date,p_category,p_notes,false); $$;
create function public.expense_location_add_shared(p_card_id uuid,p_description text,p_amount numeric,p_expense_date date,p_category text default null,p_notes text default null)
returns uuid language sql security invoker set search_path='' as $$ select expense_sharing_private.add_located_expense(p_card_id,p_description,p_amount,p_expense_date,p_category,p_notes,true); $$;

revoke all on all functions in schema expense_sharing_private from public,anon;
grant execute on all functions in schema expense_sharing_private to authenticated;
revoke all on function public.expense_location_create(text,text),public.expense_location_rename(uuid,text),
  public.expense_location_invite(uuid,text),public.expense_location_add_personal(uuid,text,numeric,date,text,text),
  public.expense_location_add_shared(uuid,text,numeric,date,text,text) from public,anon;
grant execute on function public.expense_location_create(text,text),public.expense_location_rename(uuid,text),
  public.expense_location_invite(uuid,text),public.expense_location_add_personal(uuid,text,numeric,date,text,text),
  public.expense_location_add_shared(uuid,text,numeric,date,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
