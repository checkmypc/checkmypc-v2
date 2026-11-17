alter table accessories add column if not exists slug text;

with normalized as (
  select
    id,
    trim(both '-' from left(
      trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
      80
    )) as base_slug
  from accessories
),
ranked as (
  select
    id,
    coalesce(nullif(base_slug, ''), 'accessory') as base_slug,
    row_number() over (partition by coalesce(nullif(base_slug, ''), 'accessory') order by id) as position
  from normalized
)
update accessories as accessory
set slug = case
  when ranked.position = 1 then ranked.base_slug
  else ranked.base_slug || '-' || accessory.id
end
from ranked
where ranked.id = accessory.id;

alter table accessories alter column slug set not null;
create unique index if not exists accessories_slug_idx on accessories (slug);
