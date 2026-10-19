-- Integration tests: isolated PostgreSQL only, never production.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('50000000-0000-4000-8000-000000000001','author-owner@example.test',now(),'{"full_name":" "}'),
('50000000-0000-4000-8000-000000000002','author-guest@example.test',now(),'{"full_name":"Bruno"}'),
('50000000-0000-4000-8000-000000000003','author-other@example.test',now(),'{}');
insert into public.profiles(user_id,display_name) values
('50000000-0000-4000-8000-000000000001','Ana'),
('50000000-0000-4000-8000-000000000002','Old name'),
('50000000-0000-4000-8000-000000000003','Carla');
create function pg_temp.assert_true(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.expect_error(command text,expected text) returns void language plpgsql as $$
declare caught text;
begin
  begin execute command; exception when others then get stacked diagnostics caught=returned_sqlstate; end;
  if caught is distinct from expected then raise exception 'Expected %, got %: %',expected,caught,command; end if;
end $$;
set local role anon;
select pg_temp.expect_error('select public.expense_sharing_snapshot()','42501');
set local role authenticated;
select pg_temp.expect_error('select public.expense_sharing_snapshot()','42501');
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000001',true);
select public.expense_location_create('Casa','shared') as location_id \gset
select public.expense_location_add_shared(:'location_id','Internet',100.01,'2026-10-19') as owner_expense_id \gset
select pg_temp.assert_true((select created_by=auth.uid() from public.shared_expense_cards where id=:'owner_expense_id'),'default records owner publisher');
select pg_temp.assert_true((select item->>'created_by_name'='Ana' from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') item where item->>'id'=:'owner_expense_id'),'publisher falls back to registered profile');
select public.expense_location_invite(:'location_id','author-guest@example.test') as invitation_id \gset
select public.expense_location_invite(:'location_id','author-other@example.test') as pending_id \gset

select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=0,'pending participant cannot read expenses or authors');
select public.expense_sharing_respond(:'invitation_id','accepted');
select public.expense_location_add_shared(:'location_id','Energia',150,'2026-10-19') as guest_expense_id \gset
select pg_temp.assert_true((select created_by=auth.uid() and owner_id='50000000-0000-4000-8000-000000000001'::uuid from public.shared_expense_cards where id=:'guest_expense_id'),'guest publisher is distinct from location owner');
select pg_temp.assert_true((select item->>'created_by_name'='Bruno' and (item->>'amount')::numeric=75 and (item->>'total_amount')::numeric=150 from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') item where item->>'id'=:'guest_expense_id'),'snapshot returns actual publisher without changing financial shares');
select pg_temp.assert_true(public.expense_sharing_snapshot()::text not like '%author-owner@example.test%','members see display names rather than owner email');
select pg_temp.expect_error('update public.shared_expense_cards set created_by=auth.uid()','42501');

reset role;
insert into public.shared_expense_cards(id,owner_id,description,amount,expense_date,location_card_id,expense_split,created_by)
values('50000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000001','Historical expense',80,'2026-10-18',:'location_id','{"50000000-0000-4000-8000-000000000001":80}',null);
insert into public.shared_expense_cards(id,owner_id,description,amount,expense_date,created_by)
values('50000000-0000-4000-8000-000000000011','50000000-0000-4000-8000-000000000001','Legacy standalone',50,'2026-10-18',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((select item->>'created_by_name' is null from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') item where item->>'id'='50000000-0000-4000-8000-000000000010'),'historical located expense never guesses location owner as publisher');
select pg_temp.assert_true((select item->>'created_by_name'='Ana' from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') item where item->>'id'='50000000-0000-4000-8000-000000000011'),'legacy standalone publisher is its original owner');
select pg_temp.assert_true((select item->>'created_by_name'='Bruno' from jsonb_array_elements(public.expense_sharing_snapshot()->'cards') item where item->>'id'=:'guest_expense_id'),'owner sees the guest publisher');
select public.expense_location_create('Consultorio','personal') as personal_id \gset
select pg_temp.assert_true((select item->>'owner_name'='Ana' from jsonb_array_elements(public.expense_sharing_snapshot()->'locations') item where item->>'id'=:'personal_id'),'personal location resolves its registered owner name');
select pg_temp.assert_true((select exists(select 1 from jsonb_array_elements(item->'participants') member where member->>'name'='Bruno') from jsonb_array_elements(public.expense_sharing_snapshot()->'locations') item where item->>'id'=:'location_id'),'participant display names use current account name');

select set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=0,'unaccepted user cannot read author names');
select pg_temp.assert_true(public.expense_sharing_snapshot()::text not like '%Bruno%','author name does not leak through pending invitation');
reset role;
delete from auth.users where id='50000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select created_by is null and amount=150 from public.shared_expense_cards where id=:'guest_expense_id'),'deleting publisher preserves the shared expense');
select pg_temp.assert_true((select bool_and(relrowsecurity) from pg_class where oid in ('public.shared_expense_cards'::regclass,'public.shared_expense_invitations'::regclass)),'RLS remains enabled');
rollback;
select 'Expense authors integration tests passed' as result;
