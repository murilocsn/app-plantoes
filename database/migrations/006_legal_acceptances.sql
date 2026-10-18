
-- Registro de aceite dos documentos legais
-- Preparacao inicial: nao executar em producao

create table if not exists public.legal_acceptances (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references auth.users(id) on delete cascade,

    document_type text not null
        check (document_type in ('terms', 'privacy')),

    document_version text not null,

    document_sha256 text not null
        check (document_sha256 ~ '^[0-9a-f]{64}$'),

    accepted_at timestamptz not null default now(),

    evidence_source text not null
        check (evidence_source in (
            'signup_hook',
            'authenticated_confirmation'
        )),

    unique (user_id, document_type, document_version)
);

create index if not exists
    idx_legal_acceptances_user
    on public.legal_acceptances(user_id);

alter table public.legal_acceptances
    enable row level security;

revoke all on public.legal_acceptances
    from anon, authenticated;

grant select on public.legal_acceptances
    to authenticated;

create policy "Users read own legal acceptances"
    on public.legal_acceptances
    for select
    to authenticated
    using (auth.uid() = user_id);
