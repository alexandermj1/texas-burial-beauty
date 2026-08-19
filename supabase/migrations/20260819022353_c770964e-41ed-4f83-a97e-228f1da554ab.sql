with anchors(region, lat, lng) as (values
 ('Dallas–Fort Worth',32.78,-96.80),('Dallas–Fort Worth',32.75,-97.33),('Dallas–Fort Worth',33.02,-96.70),('Dallas–Fort Worth',32.74,-97.11),
 ('Greater Houston',29.76,-95.37),('Greater Houston',29.55,-95.10),('Greater Houston',30.07,-95.44),('Greater Houston',29.30,-94.80),
 ('Austin',30.27,-97.74),('Austin',30.51,-97.82),('Austin',29.88,-97.94),
 ('San Antonio',29.42,-98.49),('San Antonio',29.70,-98.12),
 ('Central Texas',31.55,-97.14),('Central Texas',31.10,-97.34),('Central Texas',31.12,-97.73),('Central Texas',30.63,-96.33),
 ('East Texas',32.35,-95.30),('East Texas',32.50,-94.74),('East Texas',30.08,-94.13),('East Texas',31.34,-94.73),('East Texas',33.43,-94.05),('East Texas',32.20,-95.86),
 ('El Paso & West Texas',31.76,-106.49),('El Paso & West Texas',31.99,-102.08),('El Paso & West Texas',31.85,-102.37),('El Paso & West Texas',31.46,-100.44),
 ('South Texas',27.80,-97.40),('South Texas',26.20,-98.23),('South Texas',25.90,-97.50),('South Texas',27.51,-99.51),('South Texas',28.80,-97.00),
 ('West & North Texas',33.58,-101.86),('West & North Texas',35.22,-101.83),('West & North Texas',32.45,-99.73),('West & North Texas',33.91,-98.49)
), best as (
  select t.id, (
    select a.region from anchors a
    order by ((a.lat - t.latitude)^2 + ((a.lng - t.longitude) * cos(radians(t.latitude)))^2) asc
    limit 1
  ) as region
  from public.texas_cemeteries t
  where t.latitude is not null and t.longitude is not null
)
update public.texas_cemeteries t
set region = b.region
from best b
where b.id = t.id and coalesce(t.region,'') is distinct from b.region;