(() => {
  const supabaseClient = () => {
    if (window.FINANCPLANTOES_DB) return window.FINANCPLANTOES_DB;
    if (window.supabase?.createClient && window.FINANCPLANTOES_SUPABASE) {
      window.FINANCPLANTOES_DB = window.supabase.createClient(
        window.FINANCPLANTOES_SUPABASE.url,
        window.FINANCPLANTOES_SUPABASE.publishableKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
      return window.FINANCPLANTOES_DB;
    }
    throw new Error('Conexão com o Supabase não está disponível.');
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function closeLocationModal() {
    const root = document.getElementById('modalRoot');
    if (root) root.innerHTML = '';
  }

  async function currentUser() {
    const db = supabaseClient();
    const { data, error } = await db.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    return data.session.user;
  }

  async function getLocation(id) {
    const db = supabaseClient();
    const user = await currentUser();
    const { data, error } = await db.from('locations')
      .select('id,name,value12,doc,active,reference_start_day,reference_end_day,payment_due_day,payment_due_months_after')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Local não encontrado ou você não tem acesso a ele.');
    return data;
  }

  function renderLocationModal(location = null) {
    const root = document.getElementById('modalRoot');
    if (!root) return;

    const editing = Boolean(location?.id);
    root.innerHTML = `
      <div class="modal-backdrop" id="locationModalBackdrop">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="locationModalTitle">
          <div class="modal-head">
            <div>
              <p class="eyebrow">CADASTROS</p>
              <h3 id="locationModalTitle">${editing ? 'Editar local' : 'Novo local'}</h3>
            </div>
            <button class="close-btn" type="button" id="closeLocationModal" aria-label="Fechar">×</button>
          </div>
          <form id="locationForm">
            <div class="modal-grid">
              <label class="wide">Nome do local
                <input name="name" type="text" maxlength="120" required value="${escapeHtml(location?.name || '')}" placeholder="Ex.: Hospital Municipal">
              </label>
              <label>Valor padrão do plantão
                <input name="value12" type="number" min="0" step="0.01" inputmode="decimal" required value="${location?.value12 ?? ''}" placeholder="0,00">
              </label>
              <label>Documento / identificação
                <input name="doc" type="text" maxlength="120" value="${escapeHtml(location?.doc || '')}" placeholder="Opcional">
              </label>
              <label>Início do período
                <input name="reference_start_day" type="number" min="1" max="31" required value="${location?.reference_start_day ?? 1}">
              </label>
              <label>Fim do período
                <input name="reference_end_day" type="number" min="1" max="31" required value="${location?.reference_end_day ?? 28}">
              </label>
              <label>Dia do pagamento
                <input name="payment_due_day" type="number" min="1" max="31" required value="${location?.payment_due_day ?? 10}">
              </label>
              <label>Meses após o período
                <input name="payment_due_months_after" type="number" min="0" max="12" required value="${location?.payment_due_months_after ?? 1}">
              </label>
              ${editing ? `<label class="inline-check wide"><input name="active" type="checkbox" ${location.active !== false ? 'checked' : ''}> Local ativo para novos plantões</label>` : ''}
            </div>
            <p id="locationFormMessage" class="message" role="alert"></p>
            <div class="modal-actions">
              <button class="secondary" type="button" id="cancelLocationModal">Cancelar</button>
              <button class="primary" type="submit" id="saveLocationButton">${editing ? 'Salvar alterações' : 'Adicionar local'}</button>
            </div>
          </form>
        </div>
      </div>`;

    document.getElementById('closeLocationModal')?.addEventListener('click', closeLocationModal);
    document.getElementById('cancelLocationModal')?.addEventListener('click', closeLocationModal);
    document.getElementById('locationModalBackdrop')?.addEventListener('click', (event) => {
      if (event.target.id === 'locationModalBackdrop') closeLocationModal();
    });

    document.getElementById('locationForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = document.getElementById('saveLocationButton');
      const message = document.getElementById('locationFormMessage');
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const value12 = Number(formData.get('value12'));
      const doc = String(formData.get('doc') || '').trim() || null;
      const reference_start_day = Number(formData.get('reference_start_day'));
      const reference_end_day = Number(formData.get('reference_end_day'));
      const payment_due_day = Number(formData.get('payment_due_day'));
      const payment_due_months_after = Number(formData.get('payment_due_months_after'));

      if (!name) {
        message.textContent = 'Informe o nome do local.';
        message.className = 'message error';
        return;
      }
      if (!Number.isFinite(value12) || value12 < 0) {
        message.textContent = 'Informe um valor válido para o plantão.';
        message.className = 'message error';
        return;
      }
      if (![reference_start_day, reference_end_day, payment_due_day, payment_due_months_after].every(Number.isInteger) || reference_start_day < 1 || reference_start_day > 31 || reference_end_day < 1 || reference_end_day > 31 || payment_due_day < 1 || payment_due_day > 31 || payment_due_months_after < 0 || payment_due_months_after > 12) {
        message.textContent = 'Informe corretamente as regras de período e pagamento.';
        message.className = 'message error';
        return;
      }

      button.disabled = true;
      message.textContent = editing ? 'Salvando alterações...' : 'Adicionando local...';
      message.className = 'message';

      try {
        const db = supabaseClient();
        const user = await currentUser();
        const payload = { name, value12, doc, reference_start_day, reference_end_day, payment_due_day, payment_due_months_after };

        if (editing) {
          payload.active = formData.get('active') === 'on';
          const { error } = await db.from('locations')
            .update(payload)
            .eq('id', location.id)
            .eq('user_id', user.id);
          if (error) throw error;
        } else {
          payload.id = crypto.randomUUID();
          payload.user_id = user.id;
          payload.active = true;
          const { error } = await db.from('locations').insert(payload);
          if (error) throw error;
        }

        closeLocationModal();
        window.location.reload();
      } catch (error) {
        console.error('Erro ao salvar local:', error);
        message.textContent = error?.message || 'Não foi possível salvar o local.';
        message.className = 'message error';
        button.disabled = false;
      }
    });

    root.querySelector('input[name="name"]')?.focus();
  }

  async function openLocationForm(id = '') {
    try {
      const location = id ? await getLocation(id) : null;
      renderLocationModal(location);
    } catch (error) {
      console.error('Erro ao abrir local:', error);
      alert(error?.message || 'Não foi possível abrir o cadastro do local.');
    }
  }

  window.openForm = (type, id, ...args) => {
    if (type === 'location') return openLocationForm(id || '');
    if (typeof window.__legacyOpenForm === 'function') return window.__legacyOpenForm(type, id, ...args);
    console.warn(`Formulário não implementado neste fluxo: ${type}`);
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addLocation')?.addEventListener('click', () => openLocationForm(''));
  });
})();
