-- Adds optional weekday selection to weekly recurrence rules.
-- Values follow JavaScript Date.getDay(): 0=Sunday ... 6=Saturday.

alter table public.recurrences
  add column if not exists weekdays integer[];

do $$
begin
  alter table public.recurrences
    add constraint recurrences_weekdays_valid
    check (
      weekdays is null
      or (
        frequency = 'weekly'
        and cardinality(weekdays) between 1 and 7
        and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
      )
    );
exception
  when duplicate_object then null;
end $$;

comment on column public.recurrences.weekdays is
  'Selected weekdays for weekly recurrence rules. 0=Sunday ... 6=Saturday.';
