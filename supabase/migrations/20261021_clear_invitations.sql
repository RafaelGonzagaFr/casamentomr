begin;
create or replace function public.wedding_clear_invitations(p_admin uuid, p_confirmation text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare total bigint;
begin
 if p_confirmation is distinct from 'EXCLUIR TODOS' then
  raise exception 'Digite EXCLUIR TODOS para confirmar.';
 end if;
 if p_admin is null or not exists(select 1 from public.admin_users where id=p_admin and is_active) then
  raise exception using errcode='42501', message='Acesso administrativo necessário.';
 end if;
 -- Prevent concurrent writes while dependent records are removed atomically.
 lock table public.invitations, public.guests, public.invitation_tokens,
  public.gift_reservations, public.app_sessions in access exclusive mode;
 select count(*) into total from public.invitations;
 delete from public.app_sessions where invitation_id is not null;
 delete from public.gift_reservations;
 delete from public.guests;
 delete from public.invitation_tokens;
 delete from public.invitations;
 insert into public.activity_logs(actor_type,actor_id,action,entity_type,metadata)
 values('ADMIN_USER',p_admin::text,'invitations.cleared','Invitation',jsonb_build_object('invitations_deleted',total));
 return jsonb_build_object('deleted',total);
end;
$$;
revoke all on function public.wedding_clear_invitations(uuid,text) from public,anon,authenticated;
grant execute on function public.wedding_clear_invitations(uuid,text) to service_role;
commit;
