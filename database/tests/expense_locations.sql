-- Real PostgreSQL integration tests, rolled back. Use only the isolated fixture.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('40000000-0000-4000-8000-000000000001','location-owner@example.test',now(),'{"full_name":"Ana"}'),
('40000000-0000-4000-8000-000000000002','location-guest@example.test',now(),'{"full_name":"Bruno"}'),
('40000000-0000-4000-8000-000000000003','location-other@example.test',now(),'{"full_name":"Carla"}'),
('40000000-0000-4000-8000-000000000004','location-unconfirmed@example.test',null,'{}');
create function pg_temp.assert_true(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_error(command text,expected text) returns void language plpgsql as $$
declare caught text;
begin
  begin execute command; exception when others then get stacked diagnostics caught=returned_sqlstate; end;
  if caught is distinct from expected then raise exception 'Expected %, got %: %',expected,caught,command; end if;
end $$;
set local role anon;
select pg_temp.expect_error('select public.expense_location_create(''Casa'',''shared'')','42501');
select pg_temp.expect_error('select public.expense_location_invite(gen_random_uuid(),''x@example.test'')','42501');
select pg_temp.expect_error('select * from public.shared_expense_cards','42501');
set local role authenticated;
select pg_temp.expect_error('select public.expense_location_create(''Casa'',''shared'')','42501');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error('select public.expense_location_create(''A'',''shared'')','22023');
select pg_temp.expect_error('select public.expense_location_create(''Casa'',''public'')','22023');
select public.expense_location_create('Consultório','personal') as personal_id \gset
select public.expense_location_create('Residência','shared') as shared_id \gset
select public.expense_location_add_personal(:'personal_id','Material',230,'2026-10-18','Trabalho') as personal_expense_id \gset
select public.expense_location_add_shared(:'shared_id','Internet',100.01,'2026-10-18','Moradia') as first_expense_id \gset
select pg_temp.assert_true((select amount=0 and card_kind='location' from public.shared_expense_cards where id=:'shared_id'),'location container never charges a cost');
select pg_temp.assert_true((select count(*)=1 from public.personal_expenses where location_card_id=:'personal_id'),'personal expense linked');
select pg_temp.expect_error(format('select public.expense_location_add_personal(%L,''Wrong'',10,current_date)',:'shared_id'),'42501');
select pg_temp.expect_error(format('select public.expense_location_add_shared(%L,''Wrong'',10,current_date)',:'personal_id'),'42501');
select pg_temp.expect_error(format('select public.expense_location_add_shared(%L,''Wrong'',0,current_date)',:'shared_id'),'22023');
select pg_temp.expect_error(format('select public.expense_location_add_shared(%L,''Wrong'',1.001,current_date)',:'shared_id'),'22023');
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''location-guest@example.test'')',:'personal_id'),'22023');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''location-guest@example.test'',10)',:'shared_id'),'22023');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''location-guest@example.test'',10)',:'first_expense_id'),'22023');
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''location-owner@example.test'')',:'shared_id'),'22023');
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''missing@example.test'')',:'shared_id'),'22023');
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''location-unconfirmed@example.test'')',:'shared_id'),'22023');
select public.expense_location_invite(:'shared_id',' LOCATION-GUEST@EXAMPLE.TEST ') as guest_invite \gset
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''location-guest@example.test'')',:'shared_id'),'23505');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=1,'only expense, no container, included in finance');

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_cards),'pending recipient cannot select location or children');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'locations')=0,'pending recipient snapshot has no locations');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=0,'pending recipient sees no expenses');
select pg_temp.assert_true((public.expense_sharing_snapshot()->'invitations'->0->>'is_location')::boolean,'invitation identifies location without expense contents');
select pg_temp.expect_error(format('select public.expense_location_add_shared(%L,''Forbidden'',10,current_date)',:'shared_id'),'42501');
select pg_temp.expect_error(format('select public.expense_location_invite(%L,''location-other@example.test'')',:'shared_id'),'42501');
select pg_temp.expect_error(format('select public.expense_location_rename(%L,''Stolen'')',:'shared_id'),'42501');
select pg_temp.expect_error(format('insert into public.personal_expenses(user_id,description,amount,expense_date,location_card_id) values(auth.uid(),''Forbidden'',1,current_date,%L)',:'personal_id'),'42501');
select pg_temp.expect_error(format('select public.expense_location_add_personal(%L,''Forbidden'',1,current_date)',:'personal_id'),'42501');
select public.expense_sharing_respond(:'guest_invite','accepted');
select pg_temp.assert_true((select count(*)=2 from public.shared_expense_cards),'accepted recipient reads location and existing children under RLS');
select pg_temp.assert_true((select count(*)=0 from public.personal_expenses),'accepted recipient never sees personal expenses');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'personal_locations')=0,'no private personal associations in snapshot');
select pg_temp.assert_true((public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric=0,'late acceptance never reallocates existing expense');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'locations'->0->'participants')=2,'accepted participants visible');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'locations'->0->'invitations')=0,'member sees no other participant email addresses');
select public.expense_location_add_shared(:'shared_id','Energia',100.01,'2026-10-19') as second_expense_id \gset
select pg_temp.assert_true((select (expense_split->>'40000000-0000-4000-8000-000000000001')::numeric=50.01 from public.shared_expense_cards where id=:'second_expense_id'),'owner keeps rounding cent');
select pg_temp.assert_true((select (expense_split->>'40000000-0000-4000-8000-000000000002')::numeric=50 from public.shared_expense_cards where id=:'second_expense_id'),'accepted guest receives exact equal share');
select pg_temp.expect_error(format('select public.expense_sharing_cancel(%L)',:'guest_invite'),'P0002');
select pg_temp.expect_error('update public.shared_expense_cards set expense_split=''{}''','42501');

select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.expense_location_invite(:'shared_id','location-other@example.test') as other_invite \gset
select public.expense_sharing_cancel(:'other_invite');
select public.expense_sharing_cancel(:'other_invite');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error(format('select public.expense_sharing_respond(%L,''accepted'')',:'other_invite'),'P0001');
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_cards),'cancelled invite grants no access');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.expense_location_invite(:'shared_id','location-other@example.test') as declined_invite \gset
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
select public.expense_sharing_respond(:'declined_invite','declined');
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_cards),'declined invite grants no access');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.expense_location_invite(:'shared_id','location-other@example.test') as accepted_invite \gset
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
select public.expense_sharing_respond(:'accepted_invite','accepted');
select public.expense_location_add_shared(:'shared_id','Limpeza',10,'2026-11-01') as third_expense_id \gset
select pg_temp.assert_true((select (expense_split->>'40000000-0000-4000-8000-000000000001')::numeric=3.34 and (expense_split->>'40000000-0000-4000-8000-000000000003')::numeric=3.33 from public.shared_expense_cards where id=:'third_expense_id'),'three-person split preserves cents');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select (expense_split->>'40000000-0000-4000-8000-000000000001')::numeric=50.01 from public.shared_expense_cards where id=:'second_expense_id'),'third acceptance leaves previous shares untouched');
select pg_temp.assert_true((select sum((entry->>'amount')::numeric)=150.02 from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') entry where entry->>'expense_date'>='2026-10-01' and entry->>'expense_date'<='2026-10-31'),'period total includes only recorded owner shares');
select public.expense_location_rename(:'shared_id','Casa');
select pg_temp.assert_true((select description='Casa' from public.shared_expense_cards where id=:'shared_id'),'owner renames location');
reset role;
select pg_temp.assert_true((select bool_and(relrowsecurity) from pg_class where oid in ('public.shared_expense_cards'::regclass,'public.shared_expense_invitations'::regclass,'public.personal_expenses'::regclass)),'all affected tables retain RLS');
rollback;
select 'Expense locations SQL integration tests passed' as result;
