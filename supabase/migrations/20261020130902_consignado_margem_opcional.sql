CREATE OR REPLACE FUNCTION public.atualizar_margem_consignado_proposta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_old_consignado boolean := false;
  v_new_consignado boolean := false;
  v_delta numeric(12, 2);
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.tipos_proposta AS t
      WHERE t.codigo = OLD.tipo_proposta_codigo
        AND (
          lower(coalesce(t.categoria, '')) LIKE '%consignado%'
          OR lower(coalesce(t.nome, '')) LIKE '%consignado%'
          OR lower(coalesce(t.codigo, '')) LIKE '%consignado%'
          OR lower(coalesce(t.categoria, '')) LIKE '%trabalhador%'
          OR lower(coalesce(t.nome, '')) LIKE '%trabalhador%'
          OR lower(coalesce(t.codigo, '')) LIKE '%trabalhador%'
        )
    ) INTO v_old_consignado;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.tipos_proposta AS t
      WHERE t.codigo = NEW.tipo_proposta_codigo
        AND (
          lower(coalesce(t.categoria, '')) LIKE '%consignado%'
          OR lower(coalesce(t.nome, '')) LIKE '%consignado%'
          OR lower(coalesce(t.codigo, '')) LIKE '%consignado%'
          OR lower(coalesce(t.categoria, '')) LIKE '%trabalhador%'
          OR lower(coalesce(t.nome, '')) LIKE '%trabalhador%'
          OR lower(coalesce(t.codigo, '')) LIKE '%trabalhador%'
        )
    ) INTO v_new_consignado;
  END IF;

  IF v_new_consignado AND (NEW.cliente_id IS NULL OR NEW.valor_parcela IS NULL OR NEW.valor_parcela <= 0) THEN
    RAISE EXCEPTION 'Informe o cliente e um valor de parcela maior que zero para propostas consignadas.';
  END IF;

  IF v_old_consignado AND v_new_consignado
    AND OLD.cliente_id IS NOT DISTINCT FROM NEW.cliente_id THEN
    v_delta := coalesce(NEW.valor_parcela, 0) - coalesce(OLD.valor_parcela, 0);

    IF v_delta <> 0 THEN
      UPDATE public.clientes
      SET margem_disponivel = margem_disponivel - v_delta
      WHERE id = NEW.cliente_id
        AND margem_disponivel IS NOT NULL;
    END IF;

    RETURN NULL;
  END IF;

  IF v_old_consignado AND OLD.valor_parcela IS NOT NULL AND OLD.valor_parcela <> 0 THEN
    UPDATE public.clientes
    SET margem_disponivel = margem_disponivel + OLD.valor_parcela
    WHERE id = OLD.cliente_id
      AND margem_disponivel IS NOT NULL;
  END IF;

  IF v_new_consignado THEN
    UPDATE public.clientes
    SET margem_disponivel = margem_disponivel - NEW.valor_parcela
    WHERE id = NEW.cliente_id
      AND margem_disponivel IS NOT NULL;
  END IF;

  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS propostas_atualizar_margem_consignado ON public.propostas;

CREATE TRIGGER propostas_atualizar_margem_consignado
AFTER INSERT OR UPDATE OR DELETE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_margem_consignado_proposta();