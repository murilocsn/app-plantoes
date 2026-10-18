-- Local integration tests with real PostgreSQL roles, RLS and RPC functions.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
('10000000-0000-4000-8000-000000000001','owner@example.test',now(),'{"full_name":"Criador de teste"}'),
('10000000-0000-4000-8000-000000000002','guest@example.test',now(),'{}'),
('10000000-0000-4000-8000-000000000003','third@example.test',now(),'{}'),
('10000000-0000-4000-8000-000000000004','unconfirmed@example.test',null,'{}');
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
select pg_temp.expect_error('select * from public.shared_expense_cards','42501');
select pg_temp.expect_error('select * from public.shared_expense_invitations','42501');
set local role authenticated;
select pg_temp.expect_error('select public.expense_sharing_snapshot()','42501');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.expense_sharing_create('Despesa principal',300.01,'2026-10-15') as card_id \gset
select set_config('test.card_id',:'card_id',true);
select pg_temp.assert_true((select count(*)=1 from public.shared_expense_cards),'owner reads own card');
select pg_temp.expect_error('insert into public.shared_expense_cards(owner_id,description,amount,expense_date) values(auth.uid(),''Forbidden'',1,current_date)','42501');
select pg_temp.expect_error('select public.expense_sharing_create(''No'',0,current_date)','22023');
select pg_temp.expect_error('select public.expense_sharing_create(''No'',1.001,current_date)','22023');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''owner@example.test'',1)',:'card_id'),'22023');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''missing@example.test'',1)',:'card_id'),'22023');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''unconfirmed@example.test'',1)',:'card_id'),'22023');
select public.expense_sharing_invite(:'card_id',' GUEST@EXAMPLE.TEST ',100.01) as invitation_id \gset
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''guest@example.test'',1)',:'card_id'),'23505');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''third@example.test'',250)',:'card_id'),'22023');
select pg_temp.assert_true((public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric=300.01,'pending does not reduce creator cost');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_cards),'third user cannot read card');
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_invitations),'third user cannot read invitation');
select pg_temp.expect_error(format('select public.expense_sharing_invite(%L,''third@example.test'',1)',:'card_id'),'42501');
select pg_temp.expect_error(format('select public.expense_sharing_respond(%L,''accepted'')',:'invitation_id'),'P0002');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.assert_true((select count(*)=0 from public.shared_expense_cards),'recipient has no card access before acceptance');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=0,'no recipient cost before acceptance');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'invitations')=1,'recipient sees own pending invitation');
select public.expense_sharing_respond(:'invitation_id','accepted');
select public.expense_sharing_respond(:'invitation_id','accepted');
select pg_temp.assert_true((select count(*)=1 from public.shared_expense_cards),'accepted recipient reads card');
select pg_temp.assert_true((public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric=100.01,'recipient cost is exact individual amount');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards'->0->'invitations')=0,'recipient sees no other participant emails');
select pg_temp.expect_error('update public.shared_expense_invitations set amount=1','42501');
select pg_temp.expect_error('delete from public.shared_expense_cards','42501');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric=200,'creator keeps remainder in cents');
select pg_temp.expect_error(format('select public.expense_sharing_cancel(%L)',:'invitation_id'),'P0001');
select public.expense_sharing_invite(:'card_id','third@example.test',50) as cancelled_id \gset
select public.expense_sharing_cancel(:'cancelled_id');
select public.expense_sharing_cancel(:'cancelled_id');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error(format('select public.expense_sharing_respond(%L,''accepted'')',:'cancelled_id'),'P0001');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'invitations')=0,'cancelled invite leaves inbox');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.expense_sharing_invite(:'card_id','third@example.test',50) as declined_id \gset
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select public.expense_sharing_respond(:'declined_id','declined');
select pg_temp.assert_true(jsonb_array_length(public.expense_sharing_snapshot()->'cards')=0,'decline grants no access or cost');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select pg_temp.assert_true((public.expense_sharing_snapshot()->'cards'->0->>'amount')::numeric=200,'decline preserves creator share');
reset role;
select pg_temp.assert_true((select bool_and(relrowsecurity) from pg_class where oid in ('public.shared_expense_cards'::regclass,'public.shared_expense_invitations'::regclass)),'RLS enabled on both tables');
rollback;
select 'Expense sharing SQL integration tests passed' as result;
