-- f-004-medal-results-registration: alta atomica de prueba + medallas.
--
-- Supabase JS no ofrece transacciones multi-tabla desde cliente. Esta RPC
-- guarda `activity_results` y `medal_awards` juntos, validando invariantes de
-- dominio antes de insertar.

create or replace function public.create_activity_result_with_awards(
  p_edition_id uuid,
  p_activity_id uuid,
  p_participant_ids uuid[],
  p_played_at date default null,
  p_notes text default null,
  p_medal_awards jsonb default '[]'::jsonb
)
returns public.activity_results
language plpgsql
security invoker
set search_path = public
as $$
declare
  result_row public.activity_results%rowtype;
  final_participant_ids uuid[];
  participant_count int;
  unique_participant_count int;
  award jsonb;
  award_medal public.medal;
  award_person_ids uuid[];
  award_count int;
  unique_award_count int;
  seen_medals public.medal[] := '{}';
  seen_winners uuid[] := '{}';
  winner_id uuid;
begin
  if p_participant_ids is null or cardinality(p_participant_ids) = 0 then
    raise exception using errcode = '22023', message = 'participant_ids cannot be empty';
  end if;

  select array_agg(pid), count(*), count(distinct pid)
  into final_participant_ids, participant_count, unique_participant_count
  from unnest(p_participant_ids) as ids(pid)
  where pid is not null;

  if final_participant_ids is null or cardinality(final_participant_ids) = 0 then
    raise exception using errcode = '22023', message = 'participant_ids cannot be empty';
  end if;

  if participant_count <> unique_participant_count then
    raise exception using errcode = '22023', message = 'participant_ids cannot contain duplicates';
  end if;

  if jsonb_typeof(coalesce(p_medal_awards, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'medal_awards must be an array';
  end if;

  for award in select value from jsonb_array_elements(coalesce(p_medal_awards, '[]'::jsonb))
  loop
    award_medal := (award ->> 'medal')::public.medal;

    if award_medal = any(seen_medals) then
      raise exception using errcode = '23505', message = 'duplicate medal in same activity result';
    end if;
    seen_medals := array_append(seen_medals, award_medal);

    if not (award ? 'personIds') or jsonb_typeof(award -> 'personIds') <> 'array' then
      raise exception using errcode = '22023', message = 'medal personIds must be an array';
    end if;

    select array_agg(person_id), count(*), count(distinct person_id)
    into award_person_ids, award_count, unique_award_count
    from (
      select value::uuid as person_id
      from jsonb_array_elements_text(award -> 'personIds')
    ) person_ids;

    if award_count is null or award_count = 0 then
      raise exception using errcode = '22023', message = 'medal personIds cannot be empty';
    end if;

    if award_count <> unique_award_count then
      raise exception using errcode = '22023', message = 'medal personIds cannot contain duplicates';
    end if;

    foreach winner_id in array award_person_ids
    loop
      if winner_id = any(seen_winners) then
        raise exception using errcode = '22023', message = 'person cannot receive multiple medals in same activity result';
      end if;

      seen_winners := array_append(seen_winners, winner_id);

      if not winner_id = any(final_participant_ids) then
        final_participant_ids := array_append(final_participant_ids, winner_id);
      end if;
    end loop;
  end loop;

  if cardinality(seen_winners) = 0 then
    raise exception using errcode = '22023', message = 'at least one medal award is required';
  end if;

  insert into public.activity_results (
    edition_id,
    activity_id,
    participant_ids,
    played_at,
    notes,
    created_by_user_id
  )
  values (
    p_edition_id,
    p_activity_id,
    final_participant_ids,
    p_played_at,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into result_row;

  for award in select value from jsonb_array_elements(coalesce(p_medal_awards, '[]'::jsonb))
  loop
    award_medal := (award ->> 'medal')::public.medal;

    select array_agg(value::uuid)
    into award_person_ids
    from jsonb_array_elements_text(award -> 'personIds');

    insert into public.medal_awards (result_id, medal, person_ids)
    values (result_row.id, award_medal, award_person_ids);
  end loop;

  return result_row;
end;
$$;

