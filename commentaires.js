// commentaires.js - Widget de commentaires avec édition pour commentaires & réponses
window.CommentsWidget = {
  async render(container, contentId, contentType, currentUser, userProfile) {
    this.container = container;
    this.contentId = contentId;
    this.contentType = contentType;
    this.currentUser = currentUser;
    this.userProfile = userProfile;

    container.innerHTML = this.getWidgetHTML();
    this.addEventListeners();
    await this.refreshComments();
  },

  getWidgetHTML() {
    return `
      <style>
        /* Styles (conservés / propres) */
        .comments-widget { padding: 1.25rem; font-family: 'Segoe UI', sans-serif; }
        .comment-item { padding: 1rem 0; border-bottom: 1px solid #eef0f2; position: relative; }
        .comment-item:last-child { border-bottom: none; }
        .comment-header { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; }
        .comment-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:0.9rem; flex-shrink:0; }
        .comment-author { font-weight:600; color:#1c1e21; }
        .comment-date { font-size:0.75rem; color:#8a9199; margin-left:auto; }
        .comment-content { padding-left:calc(38px + 0.75rem); }
        .comment-text { color:#1c1e21; margin:0.5rem 0; line-height:1.5; white-space:pre-wrap; word-wrap:break-word; }
        .comment-actions { display:flex; gap:1rem; align-items:center; }
        .comment-btn { background:none; border:none; color:#667eea; font-size:0.8rem; cursor:pointer; font-weight:600; padding:0.25rem; display:inline-flex; align-items:center; gap:0.25rem; }
        .comment-btn:hover { text-decoration:underline; }
        .delete-btn { color:#e74c3c; }
        .replies-container { margin-left:calc(38px + 0.75rem); border-left:2px solid #eef0f2; padding-left:1rem; margin-top:0.75rem; }
        .reply-item { padding:0.75rem 0; border-bottom:1px solid #f2f4f6; }
        .comment-input-area { margin-top:1rem; position:relative; }
        .comment-textarea { width:100%; padding:0.75rem; border:1px solid #ced0d4; border-radius:8px; font-family:inherit; font-size:0.9rem; min-height:80px; resize:vertical; transition:border-color 0.3s; }
        .comment-textarea:focus { outline:none; border-color:#667eea; }
        .char-counter { font-size:0.75rem; color:#8a9199; text-align:right; margin-top:0.25rem; }
        .comment-submit { margin-top:0.5rem; padding:0.6rem 1.25rem; background:#0866ff; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; transition:background-color 0.2s, transform 0.2s; }
        .comment-submit:hover { background-color:#0655d4; transform:translateY(-1px); }
        .empty-state, .loading-state { text-align:center; padding:2.5rem 1.25rem; color:#8a9199; }
        .spinner { border:2px solid #f3f3f3; border-top:2px solid #667eea; border-radius:50%; width:24px; height:24px; animation:spin 1s linear infinite; margin:0 auto 0.5rem; }
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }

        .small-ghost { background:#f6f8fb; color:#333; padding:6px 10px; border-radius:6px; border:1px solid #e6e9ef; cursor:pointer; }
        .muted { color:#8a9199; font-size:0.9rem; }
      </style>

      <div class="comments-widget">
        <div id="comments-list-${this.contentId}">
          <div class="loading-state"><div class="spinner"></div>Chargement des commentaires...</div>
        </div>
        ${this.currentUser ? `
          <div class="comment-input-area">
            <textarea id="comment-input" class="comment-textarea" placeholder="Écrivez votre commentaire..." maxlength="1000"></textarea>
            <div class="char-counter"><span id="char-count">0</span> / 1000</div>
            <button id="comment-submit-btn" class="comment-submit">
              <i class="fas fa-paper-plane"></i> Publier
            </button>
            <div id="comment-feedback" style="color:#e74c3c; margin-top:8px; display:none;"></div>
          </div>
        ` : '<p style="text-align:center; margin-top:1rem; font-size:0.9rem;">Veuillez vous <a href="connexion.html">connecter</a> pour commenter.</p>'}
      </div>
    `;
  },

  async refreshComments() {
    const listContainer = document.getElementById(`comments-list-${this.contentId}`);
    if (!listContainer) return;
    listContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

    try {
      const { data: comments, error } = await window.supabaseClient.supabase
        .from('sessions_commentaires')
        .select(`*, users_profile(*), session_reponses(*, users_profile(*))`)
        .eq('article_id', this.contentId)
        .order('date_created', { ascending: false });

      if (error) throw error;

      listContainer.innerHTML = '';
      if (!comments || comments.length === 0) {
        listContainer.innerHTML = this.renderEmptyState();
      } else {
        comments.forEach(comment => {
          const el = this.createCommentElement(comment);
          listContainer.appendChild(el);
          this.hookCommentEvents(el, comment);
        });
      }
    } catch (err) {
      console.error('Erreur de rafraîchissement:', err);
      listContainer.innerHTML = '<div class="empty-state" style="color:#e74c3c;">Erreur de chargement des commentaires.</div>';
    }
  },

  renderEmptyState() {
    return `<div class="empty-state"><i class="fas fa-comments" style="font-size:2.2rem; display:block; margin-bottom:8px;"></i><p>Aucun commentaire pour le moment</p><p class="muted">Soyez le premier à commenter !</p></div>`;
  },

  createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    const id = comment.session_id ?? comment.id ?? comment.comment_id ?? 'unknown';
    commentEl.id = `comment-${id}`;

    const author = comment.users_profile ?? { prenom: 'Utilisateur', nom: '', role: 'user', user_id: null };
    const initials = `${(author.prenom?.[0] ?? '?')}${(author.nom?.[0] ?? '')}`.toUpperCase();
    const responses = comment.session_reponses ?? [];

    const canEdit = this.currentUser && this.currentUser.id === comment.user_id;
    const canDelete = this.userProfile && (
      this.userProfile.user_id === comment.user_id ||
      this.userProfile.role === 'adminpro' ||
      (this.userProfile.role === 'admin' && (author.role === 'user' || !author.role))
    );

    commentEl.innerHTML = `
      <div class="comment-header">
        <div class="comment-avatar">${this.escapeHtml(initials)}</div>
        <span class="comment-author">${this.escapeHtml(author.prenom)} ${this.escapeHtml(author.nom)}</span>
        <span class="comment-date">${this.formatDate(comment.date_created)}</span>
      </div>
      <div class="comment-content">
        <div class="comment-text" data-text>${this.escapeHtml(comment.texte)}</div>
        <div class="comment-actions">
          ${this.currentUser ? `<button class="comment-btn" data-action="reply">Répondre</button>` : ''}
          ${responses.length > 0 ? `<button class="comment-btn" data-action="toggle-replies">${responses.length} réponse(s)</button>` : ''}
          ${canEdit ? `<button class="comment-btn" data-action="edit">Modifier</button>` : ''}
          ${canDelete ? `<button class="comment-btn delete-btn" data-action="delete">Supprimer</button>` : ''}
        </div>
        <div class="reply-box" style="display:none; margin-top:8px;"></div>
        <div class="replies-container" style="display:none;"></div>
      </div>
    `;

    return commentEl;
  },

  hookCommentEvents(el, comment) {
    const id = comment.session_id ?? comment.id ?? comment.comment_id;
    const replyBtn = el.querySelector('[data-action="reply"]');
    const toggleRepliesBtn = el.querySelector('[data-action="toggle-replies"]');
    const editBtn = el.querySelector('[data-action="edit"]');
    const deleteBtn = el.querySelector('[data-action="delete"]');

    if (replyBtn) {
      replyBtn.addEventListener('click', () => this.openReplyBox(el, comment));
    }

    if (toggleRepliesBtn) {
      toggleRepliesBtn.addEventListener('click', () => this.toggleReplies(el, comment));
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => this.openEditComment(el, comment));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce commentaire définitivement ?')) return;
        try {
          const idToDelete = id;
          const { error } = await window.supabaseClient.supabase
            .from('sessions_commentaires')
            .delete()
            .eq('session_id', idToDelete);
          if (error) throw error;
          await this.refreshComments();
        } catch (err) {
          console.error('Erreur suppression commentaire:', err);
          alert('Erreur lors de la suppression.');
        }
      });
    }
  },

  openReplyBox(el, comment) {
    const box = el.querySelector('.reply-box');
    if (!box) return;
    if (box.style.display === 'block') {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = `
      <textarea class="comment-textarea reply-input" rows="3" placeholder="Écrire une réponse..."></textarea>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="comment-submit reply-submit">Répondre</button>
        <button class="small-ghost reply-cancel">Annuler</button>
      </div>
      <div class="reply-feedback" style="color:#e74c3c; margin-top:6px; display:none;"></div>
    `;

    const submit = box.querySelector('.reply-submit');
    const cancel = box.querySelector('.reply-cancel');
    const textarea = box.querySelector('.reply-input');
    const feedback = box.querySelector('.reply-feedback');

    cancel.addEventListener('click', () => {
      box.style.display = 'none';
      box.innerHTML = '';
    });

    submit.addEventListener('click', async () => {
      const texte = textarea.value.trim();
      if (!texte) {
        feedback.textContent = 'Écrivez une réponse avant d\'envoyer.';
        feedback.style.display = 'block';
        return;
      }
      submit.disabled = true;
      try {
        const payload = {
          session_id: comment.session_id ?? comment.id ?? comment.comment_id,
          user_id: this.currentUser.id,
          texte,
          date_created: new Date().toISOString()
        };
        const { error } = await window.supabaseClient.supabase
          .from('session_reponses')
          .insert([payload]);
        if (error) throw error;
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur réponse:', err);
        feedback.textContent = 'Impossible d\'envoyer la réponse.';
        feedback.style.display = 'block';
      } finally {
        submit.disabled = false;
      }
    });
  },

  async toggleReplies(el, comment) {
    const container = el.querySelector('.replies-container');
    if (!container) return;
    if (container.style.display === 'block') {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    const responses = comment.session_reponses ?? [];
    if (responses.length === 0) {
      container.innerHTML = '<div style="padding:8px; color:#888;">Aucune réponse.</div>';
      container.style.display = 'block';
      return;
    }

    // Construire HTML des réponses (avec boutons modifier/supprimer si autorisé)
    container.innerHTML = responses.map(r => {
      const author = r.users_profile ?? { prenom: 'Utilisateur', nom: '', role: 'user', user_id: null };
      const initials = `${(author.prenom?.[0] ?? '?')}${(author.nom?.[0] ?? '')}`.toUpperCase();
      const canEditReply = this.currentUser && this.currentUser.id === r.user_id;
      const canDeleteReply = this.userProfile && (
        this.userProfile.user_id === r.user_id ||
        this.userProfile.role === 'adminpro' ||
        (this.userProfile.role === 'admin' && (author.role === 'user' || !author.role))
      );
      const respId = r.response_id ?? r.id ?? r.session_reponse_id ?? 'rid';
      return `
        <div class="reply-item" data-reply-id="${respId}">
          <div style="display:flex; gap:10px; align-items:flex-start;">
            <div style="width:34px; height:34px; border-radius:50%; background:#eee; display:flex; align-items:center; justify-content:center; font-weight:700;">${this.escapeHtml(initials)}</div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="font-weight:600;">${this.escapeHtml(author.prenom)} ${this.escapeHtml(author.nom)}</div>
                <div style="margin-left:auto; color:#8a9199; font-size:12px;">${this.formatDate(r.date_created)}</div>
              </div>
              <div class="reply-text" data-reply-text style="margin-top:6px;">${this.escapeHtml(r.texte)}</div>
              <div style="margin-top:8px;">
                ${canEditReply ? `<button class="comment-btn small-ghost reply-edit-btn" data-action="edit-reply">Modifier</button>` : ''}
                ${canDeleteReply ? `<button class="comment-btn delete-btn small-ghost reply-delete-btn" data-action="delete-reply">Supprimer</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attacher events pour chaque réponse (édition / suppression)
    container.style.display = 'block';
    // slight delay to ensure DOM created
    setTimeout(() => {
      container.querySelectorAll('.reply-item').forEach(replyEl => {
        const rid = replyEl.getAttribute('data-reply-id');
        const editBtn = replyEl.querySelector('[data-action="edit-reply"]');
        const deleteBtn = replyEl.querySelector('[data-action="delete-reply"]');

        if (editBtn) {
          editBtn.addEventListener('click', () => this.openEditReply(replyEl, rid));
        }
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm('Supprimer cette réponse définitivement ?')) return;
            try {
              // tente par response_id, sinon id
              let { error } = await window.supabaseClient.supabase
                .from('session_reponses')
                .delete()
                .eq('response_id', rid);
              if (error) {
                // tentative alternative
                const alt = await window.supabaseClient.supabase
                  .from('session_reponses')
                  .delete()
                  .eq('id', rid);
                if (alt.error) throw alt.error;
              }
              await this.refreshComments();
            } catch (err) {
              console.error('Erreur suppression réponse:', err);
              alert('Erreur lors de la suppression de la réponse.');
            }
          });
        }
      });
    }, 0);
  },

  openEditComment(el, comment) {
    const textNode = el.querySelector('[data-text]');
    if (!textNode) return;
    const original = comment.texte ?? '';
    // Si zone d'édition déjà ouverte -> ne pas ouvrir une autre
    if (el.querySelector('.editing-area')) return;

    textNode.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'editing-area';
    editArea.innerHTML = `
      <textarea class="comment-textarea edit-input">${this.escapeHtml(original)}</textarea>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="comment-submit edit-save">Enregistrer</button>
        <button class="small-ghost edit-cancel">Annuler</button>
      </div>
      <div class="edit-feedback" style="color:#e74c3c; margin-top:6px; display:none;"></div>
    `;
    textNode.parentNode.insertBefore(editArea, textNode.nextSibling);

    const saveBtn = editArea.querySelector('.edit-save');
    const cancelBtn = editArea.querySelector('.edit-cancel');
    const textarea = editArea.querySelector('.edit-input');
    const feedback = editArea.querySelector('.edit-feedback');

    cancelBtn.addEventListener('click', () => {
      editArea.remove();
      textNode.style.display = '';
    });

    saveBtn.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      if (!newText) {
        feedback.textContent = 'Le commentaire ne peut pas être vide.';
        feedback.style.display = 'block';
        return;
      }
      saveBtn.disabled = true;
      try {
        const idToUpdate = comment.session_id ?? comment.id ?? comment.comment_id;
        const { error, data } = await window.supabaseClient.supabase
          .from('sessions_commentaires')
          .update({ texte: newText })
          .eq('session_id', idToUpdate);
        if (error) {
          // tentative alternative sur id
          const alt = await window.supabaseClient.supabase
            .from('sessions_commentaires')
            .update({ texte: newText })
            .eq('id', idToUpdate);
          if (alt.error) throw alt.error;
        }
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur modification commentaire:', err);
        feedback.textContent = 'Impossible de mettre à jour le commentaire.';
        feedback.style.display = 'block';
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  openEditReply(replyEl, rid) {
    const textNode = replyEl.querySelector('[data-reply-text]');
    if (!textNode) return;
    const original = textNode.textContent ?? '';
    if (replyEl.querySelector('.editing-reply-area')) return;

    textNode.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'editing-reply-area';
    editArea.innerHTML = `
      <textarea class="comment-textarea edit-input">${this.escapeHtml(original)}</textarea>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="comment-submit edit-save-reply">Enregistrer</button>
        <button class="small-ghost edit-cancel-reply">Annuler</button>
      </div>
      <div class="edit-feedback" style="color:#e74c3c; margin-top:6px; display:none;"></div>
    `;
    textNode.parentNode.insertBefore(editArea, textNode.nextSibling);

    const saveBtn = editArea.querySelector('.edit-save-reply');
    const cancelBtn = editArea.querySelector('.edit-cancel-reply');
    const textarea = editArea.querySelector('.edit-input');
    const feedback = editArea.querySelector('.edit-feedback');

    cancelBtn.addEventListener('click', () => {
      editArea.remove();
      textNode.style.display = '';
    });

    saveBtn.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      if (!newText) {
        feedback.textContent = 'La réponse ne peut pas être vide.';
        feedback.style.display = 'block';
        return;
      }
      saveBtn.disabled = true;
      try {
        // Tentative update par response_id ou id
        let { error } = await window.supabaseClient.supabase
          .from('session_reponses')
          .update({ texte: newText })
          .eq('response_id', rid);
        if (error) {
          const alt = await window.supabaseClient.supabase
            .from('session_reponses')
            .update({ texte: newText })
            .eq('id', rid);
          if (alt.error) throw alt.error;
        }
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur modification réponse:', err);
        feedback.textContent = 'Impossible de mettre à jour la réponse.';
        feedback.style.display = 'block';
      } finally {
        saveBtn.disabled = false;
      }
    });
  },

  addEventListeners() {
    const commentInput = this.container.querySelector('#comment-input');
    const submitBtn = this.container.querySelector('#comment-submit-btn');
    const charCount = this.container.querySelector('#char-count');

    if (commentInput) {
      commentInput.addEventListener('input', () => {
        charCount.textContent = commentInput.value.length;
      });
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const btn = this.container.querySelector('#comment-submit-btn');
          if (btn) btn.click();
        }
      });
    }
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitComment());
    }
  },

  async submitComment() {
    if (!this.currentUser) {
      alert('Connectez-vous pour publier un commentaire.');
      window.location.href = 'connexion.html';
      return;
    }
    const textarea = this.container.querySelector('#comment-input');
    const feedback = this.container.querySelector('#comment-feedback');
    const btn = this.container.querySelector('#comment-submit-btn');
    if (!textarea || !btn) return;

    const texte = textarea.value.trim();
    if (!texte) {
      feedback.textContent = 'Écrivez un commentaire avant de publier.';
      feedback.style.display = 'block';
      return;
    }
    feedback.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Envoi...';

    try {
      const payload = {
        article_id: this.contentId,
        user_id: this.currentUser.id,
        texte,
        date_created: new Date().toISOString()
      };
      const { error } = await window.supabaseClient.supabase
        .from('sessions_commentaires')
        .insert([payload]);
      if (error) throw error;
      textarea.value = '';
      this.container.querySelector('#char-count').textContent = '0';
      await this.refreshComments();
    } catch (err) {
      console.error('Erreur publication commentaire:', err);
      feedback.textContent = 'Impossible de publier le commentaire. Réessayez.';
      feedback.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-paper-plane"></i> Publier`;
    }
  },

  // utilitaires
  formatDate(dateString) {
    try {
      if (!dateString) return '';
      const d = new Date(dateString);
      return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString || '';
    }
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
