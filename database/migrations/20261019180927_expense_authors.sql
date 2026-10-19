-- Track the actual publisher without changing location ownership, expense amounts or shares.
-- Record the actual authenticated publisher for new cards; historical located expenses remain unknown.
begin;

alter table public.shared_expense_cards
  add column created_by uuid references auth.users(id) on delete set null;
-- Set the default after ADD COLUMN so preexisting rows are not attributed to the migration caller.
alter table public.shared_expense_cards alter column created_by set default auth.uid();
create index shared_expense_cards_created_by on public.shared_expense_cards(created_by)
  where created_by is not null;

-- Access filters and existing RLS stay intact; only display names are added.
create or replace function expense_sharing_private.snapshot()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_cards jsonb; v_invitations jsonb; v_locations jsonb; v_personal jsonb;
begin
  if v_uid is null then raise insufficient_privilege; end if;
  select coalesce(jsonb_agg(item order by item->>'expense_date' desc,item->>'id'),'[]'::jsonb) into v_cards from (
    select jsonb_build_object(
      'id',c.id,'owner_id',c.owner_id,'owner_name',coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(owner_profile.display_name),''),'Usuário do app'),
      'description',c.description,'expense_date',c.expense_date,'category',c.category,'notes',c.notes,'created_at',c.created_at,
      'location_card_id',c.location_card_id,'total_amount',c.amount,'is_owner',c.owner_id=v_uid,
      'created_by_name',case when creator.id is not null then coalesce(nullif(btrim(creator.raw_user_meta_data->>'full_name'),''),nullif(btrim(creator_profile.display_name),''),'Usuário do app') else null end,
      'amount',case when c.location_card_id is not null then coalesce((c.expense_split->>v_uid::text)::numeric,0)
        when c.owner_id=v_uid then c.amount-coalesce((select sum(i.amount) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),0)
        else (select i.amount from public.shared_expense_invitations i where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted') end,
      'participant_count',case when c.location_card_id is not null then (select count(*) from jsonb_object_keys(c.expense_split))
        else 1+(select count(*) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted') end,
      'invitations',case when c.location_card_id is null and c.owner_id=v_uid then coalesce((select jsonb_agg(jsonb_build_object(
        'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at
      ) order by i.created_at,i.id) from public.shared_expense_invitations i where i.card_id=c.id),'[]'::jsonb) else '[]'::jsonb end
    ) as item from public.shared_expense_cards c join auth.users u on u.id=c.owner_id
      left join auth.users creator on creator.id=coalesce(c.created_by,case when c.location_card_id is null then c.owner_id end)
      left join public.profiles creator_profile on creator_profile.user_id=creator.id left join public.profiles owner_profile on owner_profile.user_id=u.id
    where c.card_kind='expense' and (
      (c.location_card_id is null and (c.owner_id=v_uid or exists(select 1 from public.shared_expense_invitations i
        where i.card_id=c.id and i.invited_user_id=v_uid and i.status='accepted')))
      or (c.location_card_id is not null and expense_sharing_private.can_read_location(c.location_card_id))
    )
  ) cards;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.description,'visibility',c.visibility,'is_owner',c.owner_id=v_uid,
    'owner_name',coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(owner_profile.display_name),''),'Usuário do app'),
    'participant_count',1+(select count(*) from public.shared_expense_invitations i where i.card_id=c.id and i.status='accepted'),
    'participants',(select jsonb_agg(jsonb_build_object('name',member_name,'is_owner',is_owner) order by is_owner desc,member_name) from (
      select coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(owner_profile.display_name),''),'Usuário do app') as member_name,true as is_owner
      union all select coalesce(nullif(btrim(guest.raw_user_meta_data->>'full_name'),''),nullif(btrim(guest_profile.display_name),''),'Usuário do app'),false
      from public.shared_expense_invitations i join auth.users guest on guest.id=i.invited_user_id left join public.profiles guest_profile on guest_profile.user_id=guest.id where i.card_id=c.id and i.status='accepted'
    ) members),
    'invitations',case when c.owner_id=v_uid then coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at
    ) order by i.created_at,i.id) from public.shared_expense_invitations i where i.card_id=c.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by c.description,c.id),'[]'::jsonb) into v_locations
  from public.shared_expense_cards c join auth.users u on u.id=c.owner_id left join public.profiles owner_profile on owner_profile.user_id=u.id
  where c.card_kind='location' and expense_sharing_private.can_read_location(c.id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'card_id',i.card_id,'invited_email',i.invited_email,'amount',i.amount,'status',i.status,'created_at',i.created_at,
    'description',c.description,'expense_date',c.expense_date,'total_amount',c.amount,'is_location',c.card_kind='location',
    'owner_name',coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(owner_profile.display_name),''),'Usuário do app')
  ) order by i.created_at desc,i.id),'[]'::jsonb) into v_invitations
    from public.shared_expense_invitations i join public.shared_expense_cards c on c.id=i.card_id
    join auth.users u on u.id=c.owner_id left join public.profiles owner_profile on owner_profile.user_id=u.id where i.invited_user_id=v_uid and i.status='pending';
  select coalesce(jsonb_agg(jsonb_build_object('expense_id',id,'location_card_id',location_card_id)),'[]'::jsonb)
    into v_personal from public.personal_expenses where user_id=v_uid and location_card_id is not null;
  return jsonb_build_object('cards',v_cards,'locations',v_locations,'invitations',v_invitations,'personal_locations',v_personal);
end $$;

notify pgrst, 'reload schema';
commit;
