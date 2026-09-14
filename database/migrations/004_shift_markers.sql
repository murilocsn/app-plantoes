-- Shift-level visual markers chosen by the user.
-- These are intentionally tied to the shift, not the location.

alter table public.shifts
  add column if not exists marker_color text,
  add column if not exists marker_label text;

alter table public.shifts
  drop constraint if exists shifts_marker_color_check,
  drop constraint if exists shifts_marker_label_check;

alter table public.shifts
  add constraint shifts_marker_color_check check (
    marker_color is null or marker_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  add constraint shifts_marker_label_check check (
    marker_label is null or char_length(marker_label) <= 80
  );
