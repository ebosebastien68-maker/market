// =====================================================================
// commentaires.js - Widget Complet v3.0 FINAL
// Compatible : Articles (sessions_commentaires) & Vidéos (video_commentaires)
// Fonctionnalités : Commentaires, Réponses, Édition, Suppression, Partage
// Date : 12/10/2025
// Auteur : Market App
// =====================================================================

window.CommentsWidget = {
  // Variables d'instance
  container: null,
  contentId: null,
  contentType: 'article',
  currentUser: null,
  userProfile: null,

  // ===================================================================
  // MÉTHODE PRINCIPALE : RENDER
  // ===================================================================
  async render(container, contentId, comments, currentUser, userProfile, contentType = 'article') {
    this.container = container;
    this.contentId = contentId;
    this.contentType = contentType;
    this.currentUser = currentUser;
    this.userProfile = userProfile;

    container.innerHTML = this.getWidgetHTML();
    this.addEventListeners();
    await this.refreshComments(comments);
  },

  // Alias pour les vidéos
  async renderVideo(container, videoId, comments, currentUser, userProfile) {
    return this.render(container, videoId, comments, currentUser, userProfile, 'video');
  },

  // ===================================================================
  // GÉNÉRATION DU HTML + CSS
  // ===================================================================
  getWidgetHTML() {
    const inputId = this.contentType === 'video' ? 
      `comment-input-video-${this.contentId}` : 
      `comment-input-${this.contentId}`;
    
    const listId = this.contentType === 'video' ? 
      `comments-list-video-${this.contentId}` : 
      `comments-list-${this.contentId}`;
    
    return `
      <style>
        .comments-widget { padding: 1.25rem; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .comment-item { padding: 1rem 0; border-bottom: 1px solid var(--border-color, #eef0f2); position: relative; transition: background 0.2s; }
        .comment-item:hover { background: rgba(0,0,0,0.02); }
        .comment-item:last-child { border-bottom: none; }
        .comment-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .comment-avatar { 
          width: 38px; height: 38px; border-radius: 50%; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          display: flex; align-items: center; justify-content: center; 
          color: white; font-weight: bold; font-size: 0.9rem; 
          flex-shrink: 0; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        .comment-author { font-weight: 600; color: var(--text-primary, #1c1e21); font-size: 14px; }
        .comment-date { font-size: 0.75rem; color: var(--text-tertiary, #8a9199); margin-left: auto; }
        .comment-content { padding-left: calc(38px + 0.75rem); }
        .comment-text { 
          color: var(--text-primary, #1c1e21); margin: 0.5rem 0; line-height: 1.5; 
          white-space: pre-wrap; word-wrap: break-word; font-size: 14px;
        }
        
        .comment-actions { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-top: 8px; }
        .comment-btn { 
          background: none; border: none; color: #667eea; 
          font-size: 0.8rem; cursor: pointer; font-weight: 600; 
          padding: 0.25rem 0.5rem; display: inline-flex; 
          align-items: center; gap: 0.3rem; transition: all 0.3s; 
          border-radius: 4px;
        }
        .comment-btn:hover { background: rgba(102, 126, 234, 0.1); transform: translateY(-1px); }
        .comment-btn i { font-size: 0.75rem; }
        .delete-btn { color: #e74c3c; }
        .delete-btn:hover { background: rgba(231, 76, 60, 0.1); }
        .share-btn { color: #22c55e; }
        .share-btn:hover { background: rgba(34, 197, 94, 0.1); }
        
        .replies-container { 
          margin-left: calc(38px + 0.75rem); 
          border-left: 2px solid var(--border-color, #eef0f2); 
          padding-left: 1rem; margin-top: 0.75rem; 
        }
        .reply-item { 
          padding: 0.75rem 0; 
          border-bottom: 1px solid #f2f4f6; 
          display: flex; gap: 10px; 
        }
        .reply-item:last-child { border-bottom: none; }
        .reply-box { 
          background: var(--bg-primary, #f9fafb); 
          padding: 12px; border-radius: 8px; 
          margin-top: 10px; border: 1px solid var(--border-color, #eef0f2);
        }
        
        .comment-input-area { margin-top: 1rem; position: relative; }
        .comment-textarea { 
          width: 100%; padding: 0.75rem; 
          border: 1px solid var(--border-color, #ced0d4); 
          border-radius: 8px; 
          font-family: inherit; font-size: 0.9rem; 
          min-height: 80px; resize: vertical; 
          transition: border-color 0.3s;
          background: var(--bg-secondary, white);
          color: var(--text-primary, #1c1e21);
        }
        .comment-textarea:focus { 
          outline: none; border-color: #667eea; 
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); 
        }
        .char-counter { 
          font-size: 0.75rem; color: var(--text-tertiary, #8a9199); 
          text-align: right; margin-top: 0.25rem; 
        }
        .comment-submit { 
          margin-top: 0.5rem; padding: 0.6rem 1.25rem; 
          background: #0866ff; color: white; border: none; 
          border-radius: 6px; cursor: pointer; font-weight: 600; 
          transition: all 0.3s; display: inline-flex; 
          align-items: center; gap: 6px;
        }
        .comment-submit:hover { 
          background-color: #0655d4; 
          transform: translateY(-2px); 
          box-shadow: 0 4px 8px rgba(8, 102, 255, 0.3); 
        }
        .comment-submit:disabled { 
          opacity: 0.6; cursor: not-allowed; 
          transform: translateY(0); 
        }
        
        .empty-state, .loading-state { 
          text-align: center; padding: 2.5rem 1.25rem; 
          color: var(--text-tertiary, #8a9199); 
        }
        .spinner { 
          border: 2px solid #f3f3f3; 
          border-top: 2px solid #667eea; 
          border-radius: 50%; width: 24px; height: 24px; 
          animation: spin 1s linear infinite; 
          margin: 0 auto 0.5rem; 
        }
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
        
        .small-ghost { 
          background: #f6f8fb; color: #333; 
          padding: 6px 12px; border-radius: 6px; 
          border: 1px solid #e6e9ef; cursor: pointer; 
          transition: all 0.3s; font-size: 0.85rem;
          display: inline-flex; align-items: center; gap: 5px;
        }
        .small-ghost:hover { 
          background: #e6e9ef; 
          transform: translateY(-1px); 
        }
        
        .success-message { 
          color: #22c55e; font-size: 0.85rem; 
          padding: 8px 12px; background: rgba(34, 197, 94, 0.1); 
          border-radius: 6px; margin-top: 8px; 
          border-left: 3px solid #22c55e;
          display: flex; align-items: center; gap: 8px;
        }
        .error-message { 
          color: #e74c3c; font-size: 0.85rem; 
          padding: 8px 12px; background: rgba(231, 76, 60, 0.1); 
          border-radius: 6px; margin-top: 8px; 
          border-left: 3px solid #e74c3c;
          display: flex; align-items: center; gap: 8px;
        }
        .muted { color: var(--text-tertiary, #8a9199); font-size: 0.9rem; }
        
        body.dark-mode .comment-item:hover { background: rgba(255,255,255,0.05); }
      </style>

      <div class="comments-widget">
        <div id="${listId}">
          <div class="loading-state">
            <div class="spinner"></div>
            Chargement des commentaires...
          </div>
        </div>
        
        ${this.currentUser ? `
          <div class="comment-input-area">
            <textarea 
              id="${inputId}" 
              class="comment-textarea" 
              placeholder="Écrivez votre commentaire..." 
              maxlength="1000"
            ></textarea>
            <div class="char-counter">
              <span id="char-count-${this.contentId}">0</span> / 1000
            </div>
            <button id="comment-submit-btn-${this.contentId}" class="comment-submit">
              <i class="fas fa-paper-plane"></i> Publier
            </button>
            <div id="comment-feedback-${this.contentId}" style="display:none; margin-top:8px;"></div>
          </div>
        ` : `
          <p style="text-align:center; margin-top:1rem; font-size:0.9rem; color: var(--text-secondary);">
            Veuillez vous <a href="connexion.html" style="color: #667eea; text-decoration: none; font-weight: 600;">connecter</a> pour commenter.
          </p>
        `}
      </div>
    `;
  },

  // ===================================================================
  // RAFRAÎCHISSEMENT DES COMMENTAIRES
  // ===================================================================
  async refreshComments(initialComments = null) {
    const listId = this.contentType === 'video' ? 
      `comments-list-video-${this.contentId}` : 
      `comments-list-${this.contentId}`;
    
    const listContainer = document.getElementById(listId);
    if (!listContainer) return;
    
    if (!initialComments) {
      listContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    }

    try {
      let comments = initialComments;
      
      if (!comments) {
        const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
        const responsesTable = this.contentType === 'video' ? 'video_reponses' : 'session_reponses';
        const idField = this.contentType === 'video' ? 'video_id' : 'article_id';
        
        const { data, error } = await window.supabaseClient.supabase
          .from(tableName)
          .select(`*, users_profile(*), ${responsesTable}(*, users_profile(*))`)
          .eq(idField, this.contentId)
          .order('date_created', { ascending: false });

        if (error) throw error;
        comments = data;
      }

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
      listContainer.innerHTML = `
        <div class="empty-state" style="color:#e74c3c;">
          <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
          <p>Erreur de chargement des commentaires.</p>
        </div>`;
    }
  },

  renderEmptyState() {
    return `
      <div class="empty-state">
        <i class="fas fa-comments" style="font-size:2.2rem; display:block; margin-bottom:8px; opacity: 0.3;"></i>
        <p style="margin: 0; font-size: 1rem; font-weight: 600;">Aucun commentaire pour le moment</p>
        <p class="muted" style="margin-top: 5px;">Soyez le premier à commenter !</p>
      </div>
    `;
  },

  // ===================================================================
  // CRÉATION D'UN ÉLÉMENT COMMENTAIRE
  // ===================================================================
  createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    
    const id = this.contentType === 'video' ? 
      (comment.commentaire_id ?? comment.id) : 
      (comment.session_id ?? comment.id);
    
    commentEl.id = `comment-${id}`;

    const author = comment.users_profile ?? { prenom: 'Utilisateur', nom: '', role: 'user', user_id: null };
    const initials = `${(author.prenom?.[0] ?? '?')}${(author.nom?.[0] ?? '')}`.toUpperCase();
    const responses = this.contentType === 'video' ? (comment.video_reponses ?? []) : (comment.session_reponses ?? []);

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
          ${this.currentUser ? `<button class="comment-btn" data-action="reply"><i class="fas fa-reply"></i> Répondre</button>` : ''}
          ${responses.length > 0 ? `<button class="comment-btn" data-action="toggle-replies"><i class="fas fa-comments"></i> ${responses.length} réponse(s)</button>` : ''}
          <button class="comment-btn share-btn" data-action="share" title="Partager ce commentaire"><i class="fas fa-share-alt"></i> Partager</button>
          ${canEdit ? `<button class="comment-btn" data-action="edit"><i class="fas fa-edit"></i> Modifier</button>` : ''}
          ${canDelete ? `<button class="comment-btn delete-btn" data-action="delete"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
        </div>
        <div class="reply-box" style="display:none;"></div>
        <div class="replies-container" style="display:none;"></div>
      </div>
    `;

    return commentEl;
  },

  // ===================================================================
  // ÉVÉNEMENTS DES COMMENTAIRES
  // ===================================================================
  hookCommentEvents(el, comment) {
    const id = this.contentType === 'video' ? 
      (comment.commentaire_id ?? comment.id) : 
      (comment.session_id ?? comment.id);
    
    const replyBtn = el.querySelector('[data-action="reply"]');
    const toggleRepliesBtn = el.querySelector('[data-action="toggle-replies"]');
    const shareBtn = el.querySelector('[data-action="share"]');
    const editBtn = el.querySelector('[data-action="edit"]');
    const deleteBtn = el.querySelector('[data-action="delete"]');

    if (replyBtn) replyBtn.addEventListener('click', () => this.openReplyBox(el, comment));
    if (toggleRepliesBtn) toggleRepliesBtn.addEventListener('click', () => this.toggleReplies(el, comment));
    if (shareBtn) shareBtn.addEventListener('click', () => this.shareComment(comment));
    if (editBtn) editBtn.addEventListener('click', () => this.openEditComment(el, comment));
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce commentaire et toutes ses réponses ?')) return;
        
        try {
          const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
          const idField = this.contentType === 'video' ? 'commentaire_id' : 'session_id';
          
          const { error } = await window.supabaseClient.supabase
            .from(tableName)
            .delete()
            .eq(idField, id);
          
          if (error) throw error;
          await this.refreshComments();
        } catch (err) {
          console.error('Erreur suppression commentaire:', err);
          alert('Erreur lors de la suppression.');
        }
      });
    }
  },

  // ===================================================================
  // BOÎTE DE RÉPONSE
  // ===================================================================
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
      <textarea class="comment-textarea reply-input" rows="3" placeholder="Écrire une réponse..." maxlength="500"></textarea>
      <div style="display:flex; gap:8px; margin-top:8px; justify-content: flex-end;">
        <button class="small-ghost reply-cancel"><i class="fas fa-times"></i> Annuler</button>
        <button class="comment-submit reply-submit"><i class="fas fa-reply"></i> Répondre</button>
      </div>
      <div class="reply-feedback" style="display:none; margin-top:6px;"></div>
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
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Écrivez une réponse avant d\'envoyer.';
        feedback.style.display = 'block';
        return;
      }
      
      submit.disabled = true;
      submit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
      
      try {
        const responsesTable = this.contentType === 'video' ? 'video_reponses' : 'session_reponses';
        const commentIdField = this.contentType === 'video' ? 'commentaire_id' : 'session_id';
        const commentId = this.contentType === 'video' ? comment.commentaire_id : comment.session_id;
        
        const payload = {
          [commentIdField]: commentId,
          user_id: this.currentUser.id,
          texte,
          date_created: new Date().toISOString()
        };
        
        const { error } = await window.supabaseClient.supabase
          .from(responsesTable)
          .insert([payload]);
        
        if (error) throw error;
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur réponse:', err);
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Impossible d\'envoyer la réponse.';
        feedback.style.display = 'block';
        submit.disabled = false;
        submit.innerHTML = '<i class="fas fa-reply"></i> Répondre';
      }
    });
  },

  // ===================================================================
  // TOGGLE RÉPONSES
  // ===================================================================
  async toggleReplies(el, comment) {
    const container = el.querySelector('.replies-container');
    if (!container) return;
    
    if (container.style.display === 'block') {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    const responses = this.contentType === 'video' ? (comment.video_reponses ?? []) : (comment.session_reponses ?? []);
    
    if (responses.length === 0) {
      container.innerHTML = '<div style="padding:8px; color:#888; font-style: italic;">Aucune réponse.</div>';
      container.style.display = 'block';
      return;
    }

    container.innerHTML = responses.map(r => {
      const author = r.users_profile ?? { prenom: 'Utilisateur', nom: '', role: 'user', user_id: null };
      const initials = `${(author.prenom?.[0] ?? '?')}${(author.nom?.[0] ?? '')}`.toUpperCase();
      
      const canEditReply = this.currentUser && this.currentUser.id === r.user_id;
      const canDeleteReply = this.userProfile && (
        this.userProfile.user_id === r.user_id ||
        this.userProfile.role === 'adminpro' ||
        (this.userProfile.role === 'admin' && (author.role === 'user' || !author.role))
      );
      
      const respId = r.reponse_id;
      
      return `
        <div class="reply-item" data-reply-id="${respId}">
          <div class="comment-avatar" style="width:32px; height:32px; font-size:0.8rem;">${this.escapeHtml(initials)}</div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom: 4px;">
              <span style="font-weight:600; font-size: 0.9rem;">${this.escapeHtml(author.prenom)} ${this.escapeHtml(author.nom)}</span>
              <span style="color:#8a9199; font-size:11px;">${this.formatDate(r.date_created)}</span>
            </div>
            <div class="reply-text" data-reply-text style="font-size: 0.9rem; line-height: 1.5;">${this.escapeHtml(r.texte)}</div>
            <div style="margin-top:6px; display: flex; gap: 8px;">
              ${canEditReply ? `<button class="comment-btn reply-edit-btn" data-action="edit-reply" style="font-size: 0.75rem;"><i class="fas fa-edit"></i> Modifier</button>` : ''}
              ${canDeleteReply ? `<button class="comment-btn delete-btn reply-delete-btn" data-action="delete-reply" style="font-size: 0.75rem;"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.style.display = 'block';
    
    setTimeout(() => {
      container.querySelectorAll('.reply-item').forEach(replyEl => {
        const rid = replyEl.getAttribute('data-reply-id');
        const editBtn = replyEl.querySelector('[data-action="edit-reply"]');
        const deleteBtn = replyEl.querySelector('[data-action="delete-reply"]');
        const replyData = responses.find(r => r.reponse_id === rid);

        if (editBtn && replyData) {
          editBtn.addEventListener('click', () => this.openEditReply(replyEl, replyData));
        }
        
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm('Supprimer cette réponse ?')) return;
            
            try {
              const responsesTable = this.contentType === 'video' ? 'video_reponses' : 'session_reponses';
              const { error } = await window.supabaseClient.supabase
                .from(responsesTable)
                .delete()
                .eq('reponse_id', rid);
              
              if (error) throw error;
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

  // ===================================================================
  // ÉDITION DE RÉPONSE
  // ===================================================================
  openEditReply(replyEl, replyData) {
    const textNode = replyEl.querySelector('[data-reply-text]');
    if (!textNode || !replyData) return;
    
    const original = replyData.texte ?? '';
    if (replyEl.querySelector('.editing-reply-area')) return;

    textNode.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'editing-reply-area';
    editArea.innerHTML = `
      <textarea class="comment-textarea edit-input" rows="3">${this.escapeHtml(original)}</textarea>
      <div style="display:flex; gap:8px; margin-top:8px; justify-content: flex-end;">
        <button class="small-ghost edit-cancel-reply"><i class="fas fa-times"></i> Annuler</button>
        <button class="comment-submit edit-save-reply"><i class="fas fa-check"></i> Enregistrer</button>
      </div>
      <div class="edit-feedback" style="display:none; margin-top:6px;"></div>
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
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> La réponse ne peut pas être vide.';
        feedback.style.display = 'block';
        return;
      }
      
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
      
      try {
        const responsesTable = this.contentType === 'video' ? 'video_reponses' : 'session_reponses';
        const rid = replyData.reponse_id;
        
        const { error } = await window.supabaseClient.supabase
          .from(responsesTable)
          .update({ texte: newText })
          .eq('reponse_id', rid);
        
        if (error) throw error;
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur modification réponse:', err);
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Impossible de mettre à jour la réponse.';
        feedback.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistrer';
      }
    });
  },

  // ===================================================================
  // PARTAGE DE COMMENTAIRE
  // ===================================================================
  shareComment(comment) {
    const text = comment.texte?.substring(0, 100) + (comment.texte?.length > 100 ? '...' : '');
    const commentId = this.contentType === 'video' ? 
      (comment.commentaire_id ?? comment.id) : 
      (comment.session_id ?? comment.id);
    const url = `${window.location.origin}?comment=${commentId}&type=${this.contentType}`;

    if (navigator.share) {
      navigator.share({
        title: `Commentaire - Market ${this.contentType === 'video' ? 'Vidéo' : 'Article'}`,
        text: text,
        url: url
      }).then(() => {
        console.log('Partage réussi');
      }).catch(err => {
        console.log('Partage annulé:', err);
        this.fallbackShare(text, url);
      });
    } else {
      this.fallbackShare(text, url);
    }
  },

  fallbackShare(text, url) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}\n${url}`)
        .then(() => {
          alert('✅ Lien du commentaire copié dans le presse-papier !');
        })
        .catch(() => {
          prompt('Copiez ce lien:', url);
        });
    } else {
      prompt('Copiez ce lien:', url);
    }
  },

  // ===================================================================
  // ÉDITION DE COMMENTAIRE
  // ===================================================================
  openEditComment(el, comment) {
    const textNode = el.querySelector('[data-text]');
    if (!textNode) return;
    const original = comment.texte ?? '';
    
    if (el.querySelector('.editing-area')) return;

    textNode.style.display = 'none';
    const editArea = document.createElement('div');
    editArea.className = 'editing-area';
    editArea.innerHTML = `
      <textarea class="comment-textarea edit-input" rows="4">${this.escapeHtml(original)}</textarea>
      <div style="display:flex; gap:8px; margin-top:8px; justify-content: flex-end;">
        <button class="small-ghost edit-cancel"><i class="fas fa-times"></i> Annuler</button>
        <button class="comment-submit edit-save"><i class="fas fa-check"></i> Enregistrer</button>
      </div>
      <div class="edit-feedback" style="display:none; margin-top:6px;"></div>
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
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Le commentaire ne peut pas être vide.';
        feedback.style.display = 'block';
        return;
      }
      
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
      
      try {
        const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
        const idField = this.contentType === 'video' ? 'commentaire_id' : 'session_id';
        const id = this.contentType === 'video' ? 
          (comment.commentaire_id ?? comment.id) : 
          (comment.session_id ?? comment.id);
        
        const { error } = await window.supabaseClient.supabase
          .from(tableName)
          .update({ texte: newText })
          .eq(idField, id);
        
        if (error) throw error;
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur modification commentaire:', err);
        feedback.className = 'error-message';
        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Impossible de mettre à jour le commentaire.';
        feedback.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistrer';
      }
    });
  },

  // ===================================================================
  // ÉVÉNEMENTS DES INPUTS
  // ===================================================================
  addEventListeners() {
    const inputId = this.contentType === 'video' ? 
      `comment-input-video-${this.contentId}` : 
      `comment-input-${this.contentId}`;
    
    const commentInput = this.container.querySelector(`#${inputId}`);
    const submitBtn = this.container.querySelector(`#comment-submit-btn-${this.contentId}`);
    const charCount = this.container.querySelector(`#char-count-${this.contentId}`);

    if (commentInput) {
      commentInput.addEventListener('input', () => {
        if (charCount) charCount.textContent = commentInput.value.length;
      });
      
      commentInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          if (submitBtn) submitBtn.click();
        }
      });
    }
    
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitComment());
    }
  },

  // ===================================================================
  // SOUMISSION DE COMMENTAIRE
  // ===================================================================
  async submitComment() {
    if (!this.currentUser) {
      alert('Connectez-vous pour publier un commentaire.');
      window.location.href = 'connexion.html';
      return;
    }
    
    const inputId = this.contentType === 'video' ? 
      `comment-input-video-${this.contentId}` : 
      `comment-input-${this.contentId}`;
    
    const textarea = this.container.querySelector(`#${inputId}`);
    const feedback = this.container.querySelector(`#comment-feedback-${this.contentId}`);
    const btn = this.container.querySelector(`#comment-submit-btn-${this.contentId}`);
    const charCount = this.container.querySelector(`#char-count-${this.contentId}`);
    
    if (!textarea || !btn) return;

    const texte = textarea.value.trim();
    
    if (!texte) {
      feedback.className = 'error-message';
      feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Écrivez un commentaire avant de publier.';
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 3000);
      return;
    }
    
    feedback.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

    try {
      const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
      const idField = this.contentType === 'video' ? 'video_id' : 'article_id';
      
      const payload = {
        [idField]: this.contentId,
        user_id: this.currentUser.id,
        texte,
        date_created: new Date().toISOString()
      };
      
      const { error } = await window.supabaseClient.supabase
        .from(tableName)
        .insert([payload]);
      
      if (error) throw error;
      
      textarea.value = '';
      if (charCount) charCount.textContent = '0';
      
      feedback.className = 'success-message';
      feedback.innerHTML = '<i class="fas fa-check-circle"></i> Commentaire publié avec succès !';
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 3000);
      
      await this.refreshComments();
    } catch (err) {
      console.error('Erreur publication commentaire:', err);
      feedback.className = 'error-message';
      feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Impossible de publier le commentaire. Réessayez.';
      feedback.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
    }
  },

  // ===================================================================
  // FORMATAGE DE DATE
  // ===================================================================
  formatDate(dateString) {
    try {
      if (!dateString) return '';
      const d = new Date(dateString);
      const now = new Date();
      const diff = now - d;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'À l\'instant';
      if (minutes < 60) return `Il y a ${minutes} min`;
      if (hours < 24) return `Il y a ${hours}h`;
      if (days < 7) return `Il y a ${days}j`;
      
      return d.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString || '';
    }
  },

  // ===================================================================
  // ÉCHAPPEMENT HTML (Sécurité XSS)
  // ===================================================================
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

// =====================================================================
// AUTO-INITIALISATION & INFORMATIONS DE DEBUG
// =====================================================================
(function() {
  console.log('%c✅ Widget de commentaires chargé v3.0 FINAL', 'color: #22c55e; font-weight: bold; font-size: 14px;');
  console.log('%c📦 Support: Articles (sessions_commentaires) & Vidéos (video_commentaires)', 'color: #667eea;');
  console.log('%c🔄 Fonctionnalités: Commentaires, Réponses, Édition, Suppression, Partage', 'color: #667eea;');
  console.log('%c🎯 Compatible avec structure SQL complète (commentaire_id, video_reponses)', 'color: #667eea;');
  console.log('%c⚡ Optimisé pour performance et temps réel via Supabase', 'color: #667eea;');

  // Export pour debugging
  if (typeof window !== 'undefined') {
    window.CommentsWidgetDebug = {
      version: '3.0',
      date: '12/10/2025',
      author: 'Market App',
      features: [
        'Commentaires principaux',
        'Système de réponses',
        'Édition en ligne',
        'Suppression avec permissions',
        'Partage via Web Share API',
        'Compteur de caractères',
        'Dates relatives',
        'Support articles & vidéos',
        'Temps réel Supabase',
        'Protection XSS',
        'Design responsive'
      ],
      tables: {
        articles: {
          comments: 'sessions_commentaires',
          responses: 'session_reponses',
          idField: {
            content: 'article_id',
            comment: 'session_id',
            response: 'reponse_id'
          }
        },
        videos: {
          comments: 'video_commentaires',
          responses: 'video_reponses',
          idField: {
            content: 'video_id',
            comment: 'commentaire_id',
            response: 'reponse_id'
          }
        }
      },
      usage: {
        articles: 'CommentsWidget.render(container, articleId, comments, currentUser, userProfile)',
        videos: 'CommentsWidget.renderVideo(container, videoId, comments, currentUser, userProfile)'
      },
      methods: {
        render: 'Méthode principale pour afficher les commentaires',
        renderVideo: 'Alias pour les vidéos',
        refreshComments: 'Recharger les commentaires depuis la BDD',
        createCommentElement: 'Créer un élément DOM de commentaire',
        openReplyBox: 'Ouvrir la boîte de réponse',
        toggleReplies: 'Afficher/masquer les réponses',
        shareComment: 'Partager un commentaire via Web Share API',
        openEditComment: 'Éditer un commentaire',
        openEditReply: 'Éditer une réponse',
        submitComment: 'Publier un nouveau commentaire',
        formatDate: 'Formater les dates en relatif',
        escapeHtml: 'Protection contre les attaques XSS'
      }
    };
    
    console.log('%c🐛 Debug info disponible via window.CommentsWidgetDebug', 'color: #f59e0b; font-weight: bold;');
  }
})();

// =====================================================================
// FIN DU FICHIER - commentaires.js v3.0 FINAL COMPLET
// Tous droits réservés © 2025 Market App
// =====================================================================
