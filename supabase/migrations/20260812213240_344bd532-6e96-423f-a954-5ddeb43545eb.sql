create or replace function public.texas_cemeteries_set_region()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.region is null or btrim(new.region) = '' then
    new.region := coalesce(
      (select c.region from public.texas_cemeteries c
        where c.region is not null
          and lower(btrim(c.city)) = lower(btrim(new.city))
        limit 1),
      'Other Texas'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_texas_cemeteries_region on public.texas_cemeteries;
create trigger trg_texas_cemeteries_region
before insert or update of city, region on public.texas_cemeteries
for each row execute function public.texas_cemeteries_set_region();

update public.texas_cemeteries
set region = region
where region is null or btrim(region) = '';