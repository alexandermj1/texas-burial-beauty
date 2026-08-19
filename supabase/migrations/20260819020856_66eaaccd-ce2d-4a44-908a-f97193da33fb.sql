UPDATE public.cemetery_files SET cemetery_id='cd3f19a7-a6f5-4312-84a3-a0f38e56434f' WHERE cemetery_id='e4a21f74-06ae-4517-b064-65a340b4a3f9';
DELETE FROM public.texas_cemeteries WHERE id='e4a21f74-06ae-4517-b064-65a340b4a3f9';
UPDATE public.cemetery_files SET cemetery_id='97c1e1b1-8912-402a-b5b1-d23422a47cfe' WHERE cemetery_id='a94e4b39-501d-497d-8b92-1a42626c7c52';
DELETE FROM public.texas_cemeteries WHERE id='a94e4b39-501d-497d-8b92-1a42626c7c52';
UPDATE public.texas_cemeteries SET latitude=29.7156, longitude=-95.2830, geocoded_at=now() WHERE id='97c1e1b1-8912-402a-b5b1-d23422a47cfe';
UPDATE public.texas_cemeteries SET city='Beaumont', latitude=30.0862, longitude=-94.1520, geocoded_at=now() WHERE id='e6e47ccf-b326-43ac-bcbe-c19998c2527e';