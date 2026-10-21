-- Incremental: preserva dados, tabelas, assinatura e permissões.
begin;
create or replace function public.wedding_mutate(p_action text, p_data jsonb default '{}'::jsonb,
 p_invitation bigint default null, p_admin uuid default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 inv public.invitations; gift public.gifts; reservation public.gift_reservations;
 row_id bigint; total_limit integer; deadline text; result jsonb; setting_key text;
begin
 if p_admin is not null then
  if not exists(select 1 from public.admin_users where id=p_admin and is_active) then
   raise exception using errcode='42501', message='Acesso administrativo negado.';
  end if;
 elsif p_action not in ('rsvp','reserve','swap','cancel') then
  raise exception using errcode='42501', message='Acesso administrativo necessário.';
 end if;

 -- Limite global é bloqueado antes do convite, sempre na mesma ordem.
 if p_action='guest.create' then
  select value::integer into total_limit from public.wedding_settings where key='guest_limit' for update;
  if (select count(*) from public.guests where deleted_at is null) >= total_limit then
   raise exception 'Limite total de convidados atingido.';
  end if;
 end if;
 if p_invitation is not null then
  select * into inv from public.invitations where id=p_invitation and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='Convite não encontrado.'; end if;
  if p_admin is null and not inv.is_active then
   raise exception using errcode='42501', message='Convite inativo.';
  end if;
 elsif p_action in ('rsvp','reserve','swap','cancel') then
  raise exception using errcode='42501', message='Abra seu convite antes de continuar.';
 end if;

 case p_action
 when 'rsvp' then
  select value into deadline from public.wedding_settings where key='rsvp_deadline_at';
  if deadline is not null and now()>deadline::timestamptz then raise exception 'O prazo de confirmação terminou.'; end if;
  update public.guests set rsvp_status=p_data->>'rsvp_status',updated_at=now()
   where id=(p_data->>'guest_id')::bigint and invitation_id=p_invitation and deleted_at is null returning id into row_id;
  if not found then raise exception using errcode='P0002',message='Pessoa não encontrada neste convite.'; end if;
  insert into public.activity_logs(actor_type,actor_id,action,entity_type,entity_id,metadata)
   values('INVITATION',p_invitation::text,'guest.rsvp.updated','Guest',row_id,jsonb_build_object('status',p_data->>'rsvp_status'));
 when 'reserve','swap' then
  if p_action='reserve' then
   if not exists(select 1 from public.guests where invitation_id=p_invitation and deleted_at is null and rsvp_status='ATTENDING') then
    raise exception 'Confirme a presença de ao menos uma pessoa antes de escolher um presente.';
   end if;
   if exists(select 1 from public.gift_reservations where invitation_id=p_invitation and cancelled_at is null) then
    raise exception 'Você já possui um presente escolhido.';
   end if;
  else
   select * into reservation from public.gift_reservations where invitation_id=p_invitation and cancelled_at is null for update;
   if not found then raise exception 'Você não possui presente para trocar.'; end if;
  end if;
  select * into gift from public.gifts where public_id=(p_data->>'gift_public_id')::uuid and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='Presente não encontrado.'; end if;
  if p_action='swap' and gift.id=reservation.gift_id then raise exception 'Escolha outro presente.'; end if;
  if not gift.is_active then raise exception 'Esse presente não está mais disponível.'; end if;
  if exists(select 1 from public.gift_reservations where gift_id=gift.id and cancelled_at is null) then
   raise exception 'Esse presente acabou de ser escolhido por outro convite.';
  end if;
  if p_action='swap' then update public.gift_reservations set cancelled_at=now() where id=reservation.id; end if;
  insert into public.gift_reservations(gift_id,invitation_id) values(gift.id,p_invitation) returning id into row_id;
 when 'cancel' then
  update public.gift_reservations r set cancelled_at=now() from public.gifts g
   where r.gift_id=g.id and g.public_id=(p_data->>'gift_public_id')::uuid and r.invitation_id=p_invitation and r.cancelled_at is null returning r.id into row_id;
  if not found then raise exception using errcode='P0002',message='Reserva não encontrada neste convite.'; end if;
 when 'invitation.create' then
  insert into public.invitations(name,max_guests) values(p_data->>'name',(p_data->>'max_guests')::integer) returning id into row_id;
 when 'invitation.update' then
  if (p_data->>'max_guests')::integer < (select count(*) from public.guests where invitation_id=p_invitation and deleted_at is null) then
   raise exception 'O limite é menor que a quantidade de pessoas cadastradas.';
  end if;
  update public.invitations set name=p_data->>'name',max_guests=(p_data->>'max_guests')::integer,
   is_active=(p_data->>'is_active')::boolean,updated_at=now() where id=p_invitation;
  row_id:=p_invitation;
 when 'token.issue' then
  insert into public.invitation_tokens(invitation_id,token_hash) values(p_invitation,p_data->>'token_hash') returning id into row_id;
  insert into public.activity_logs(actor_type,actor_id,action,entity_type,entity_id)
   values('ADMIN_USER',p_admin::text,'invitation.token.issued','Invitation',p_invitation);
 when 'token.revoke' then
  update public.invitation_tokens set revoked_at=now() where id=(p_data->>'token_id')::bigint and invitation_id=p_invitation returning id into row_id;
  if not found then raise exception using errcode='P0002',message='Link não encontrado.'; end if;
  delete from public.app_sessions where invitation_token_id=row_id;
 when 'guest.create' then
  if (select count(*) from public.guests where invitation_id=p_invitation and deleted_at is null)>=inv.max_guests then
   raise exception 'Limite de convidados deste convite atingido.';
  end if;
  insert into public.guests(invitation_id,name) values(p_invitation,p_data->>'name') returning id into row_id;
 when 'guest.update','guest.delete' then
  update public.guests set name=case when p_action='guest.update' then p_data->>'name' else name end,
   deleted_at=case when p_action='guest.delete' then now() else null end,updated_at=now()
   where id=(p_data->>'guest_id')::bigint and invitation_id=p_invitation and deleted_at is null returning id into row_id;
  if not found then raise exception using errcode='P0002',message='Pessoa não encontrada.'; end if;
 when 'category.create' then
  insert into public.gift_categories(name,sort_order) values(p_data->>'name',coalesce((p_data->>'sort_order')::integer,0)) returning id into row_id;
 when 'category.update','category.delete' then
  row_id:=(p_data->>'category_id')::bigint;
  perform 1 from public.gift_categories where id=row_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002',message='Categoria não encontrada.'; end if;
  if p_action='category.delete' then
   if exists(select 1 from public.gifts where category_id=row_id) then raise exception 'Categoria com presentes não pode ser arquivada.'; end if;
   update public.gift_categories set deleted_at=now(),updated_at=now() where id=row_id;
  else
   update public.gift_categories set name=p_data->>'name',sort_order=(p_data->>'sort_order')::integer,updated_at=now() where id=row_id;
  end if;
 when 'gift.create','gift.update','gift.delete' then
  if p_action='gift.create' or (p_action='gift.update' and p_data ? 'category_id') then
   perform 1 from public.gift_categories where id=(p_data->>'category_id')::bigint and deleted_at is null for share;
   if not found then raise exception 'Selecione uma categoria ativa.'; end if;
  end if;
  if p_action='gift.create' then
   insert into public.gifts(category_id,name,description,image_path,estimated_price,external_url,is_active,sort_order)
   values((p_data->>'category_id')::bigint,p_data->>'name',p_data->>'description',p_data->>'image_path',
    (p_data->>'estimated_price')::numeric,p_data->>'external_url',coalesce((p_data->>'is_active')::boolean,true),coalesce((p_data->>'sort_order')::integer,0))
   returning id into row_id;
  else
   select * into gift from public.gifts where public_id=(p_data->>'gift_public_id')::uuid and deleted_at is null for update;
   if not found then raise exception using errcode='P0002',message='Presente não encontrado.'; end if;
   if exists(select 1 from public.gift_reservations where gift_id=gift.id and cancelled_at is null) then
    if p_action='gift.delete' then raise exception 'Libere a reserva antes de arquivar o presente.'; end if;
    if p_data ? 'name' and p_data->>'name'<>gift.name then raise exception 'Não é possível renomear um presente reservado.'; end if;
   end if;
   row_id:=gift.id;
   if p_action='gift.delete' then
    update public.gifts set deleted_at=now(),updated_at=now() where id=row_id;
   else
    update public.gifts set name=coalesce(p_data->>'name',name), category_id=case when p_data ? 'category_id' then (p_data->>'category_id')::bigint else category_id end,
     description=case when p_data ? 'description' then p_data->>'description' else description end,
     external_url=case when p_data ? 'external_url' then p_data->>'external_url' else external_url end,
     estimated_price=case when p_data ? 'estimated_price' then (p_data->>'estimated_price')::numeric else estimated_price end,
     image_path=case when p_data ? 'image_path' then p_data->>'image_path' else image_path end,
     is_active=coalesce((p_data->>'is_active')::boolean,is_active),sort_order=coalesce((p_data->>'sort_order')::integer,sort_order),updated_at=now()
    where id=row_id;
   end if;
  end if;
 when 'reservation.cancel' then
  -- Mesma ordem de locks: convite, depois reserva.
  select invitation_id into row_id from public.gift_reservations where id=(p_data->>'reservation_id')::bigint;
  if not found then raise exception using errcode='P0002',message='Reserva não encontrada.'; end if;
  perform 1 from public.invitations where id=row_id for update;
  select * into reservation from public.gift_reservations where id=(p_data->>'reservation_id')::bigint for update;
  if reservation.cancelled_at is not null then raise exception 'Esta reserva já foi liberada.'; end if;
  update public.gift_reservations set cancelled_at=now() where id=reservation.id;
  row_id:=reservation.id;
  insert into public.activity_logs(actor_type,actor_id,action,entity_type,entity_id,metadata)
   values('ADMIN_USER',p_admin::text,'gift_reservation.cancelled','GiftReservation',row_id,
    jsonb_build_object('gift_id',reservation.gift_id,'invitation_id',reservation.invitation_id,'reason',p_data->>'reason'));
 when 'settings.update' then
  foreach setting_key in array array['couple_names','wedding_date','rsvp_deadline_at','welcome_message','photos_drive_url','photos_title','photos_description','photos_button','photos_visible'] loop
   if p_data ? setting_key then
    insert into public.wedding_settings(key,value) values(setting_key,p_data->>setting_key)
    on conflict(key) do update set value=excluded.value,updated_at=now();
   end if;
  end loop;
 else raise exception 'Operação desconhecida.';
 end case;
 return jsonb_build_object('id',row_id);
end;
$$;

commit;
