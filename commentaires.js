// =====================================================================
// commentaires.js - Widget de commentaires avec édition 
// Support : Articles & Vidéos
// =====================================================================

window.CommentsWidget = {
  async render(container, contentId, comments, currentUser, userProfile, contentType = 'article') {
    this.container = container;
    this.contentId = contentId;
    this.contentType = contentType; // 'article' ou 'video'
    this.currentUser = currentUser;
    this.userProfile = userProfile;

    container.innerHTML = this.getWidgetHTML();
    this.addEventListeners();
    await this.refreshComments(comments);
  },

  // Méthode spécifique pour les vidéos (alias pour compatibilité)
  async renderVideo(container, videoId, comments, currentUser, userProfile) {
    return this.render(container, videoId, comments, currentUser, userProfile, 'video');
  },

  getWidgetHTML() {
    const inputId = this.contentType === 'video' ? `comment-input-video-${this.contentId}` : `comment-input-${this.contentId}`;
    const listId = this.contentType === 'video' ? `comments-list-video-${this.contentId}` : `comments-list-${this.contentId}`;
    
    return `
      <style>
        .comments-widget { padding: 1.25rem; font-family: 'Segoe UI', sans-serif; }
        .comment-item { padding: 1rem 0; border-bottom: 1px solid #eef0f2; position: relative; }
        .comment-item:last-child { border-bottom: none; }
        .comment-header { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; }
        .comment-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:0.9rem; flex-shrink:0; }
        .comment-author { font-weight:600; color:#1c1e21; }
        .comment-date { font-size:0.75rem; color:#8a9199; margin-left:auto; }
        .comment-content { padding-left:calc(38px + 0.75rem); }
        .comment-text { color:#1c1e21; margin:0.5rem 0; line-height:1.5; white-space:pre-wrap; word-wrap:break-word; }
        .comment-actions { display:flex; gap:1rem; align-items:center; flex-wrap:wrap; }
        .comment-btn { background:none; border:none; color:#667eea; font-size:0.8rem; cursor:pointer; font-weight:600; padding:0.25rem; display:inline-flex; align-items:center; gap:0.25rem; transition: all 0.3s; }
        .comment-btn:hover { text-decoration:underline; transform: translateY(-1px); }
        .delete-btn { color:#e74c3c; }
        .share-btn { color:#22c55e; }
        .replies-container { margin-left:calc(38px + 0.75rem); border-left:2px solid #eef0f2; padding-left:1rem; margin-top:0.75rem; }
        .reply-item { padding:0.75rem 0; border-bottom:1px solid #f2f4f6; }
        .comment-input-area { margin-top:1rem; position:relative; }
        .comment-textarea { width:100%; padding:0.75rem; border:1px solid #ced0d4; border-radius:8px; font-family:inherit; font-size:0.9rem; min-height:80px; resize:vertical; transition:border-color 0.3s; }
        .comment-textarea:focus { outline:none; border-color:#667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
        .char-counter { font-size:0.75rem; color:#8a9199; text-align:right; margin-top:0.25rem; }
        .comment-submit { margin-top:0.5rem; padding:0.6rem 1.25rem; background:#0866ff; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; transition:background-color 0.2s, transform 0.2s; }
        .comment-submit:hover { background-color:#0655d4; transform:translateY(-1px); }
        .comment-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .empty-state, .loading-state { text-align:center; padding:2.5rem 1.25rem; color:#8a9199; }
        .spinner { border:2px solid #f3f3f3; border-top:2px solid #667eea; border-radius:50%; width:24px; height:24px; animation:spin 1s linear infinite; margin:0 auto 0.5rem; }
        @keyframes spin { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
        .small-ghost { background:#f6f8fb; color:#333; padding:6px 10px; border-radius:6px; border:1px solid #e6e9ef; cursor:pointer; transition: all 0.3s; }
        .small-ghost:hover { background: #e6e9ef; }
        .muted { color:#8a9199; font-size:0.9rem; }
        .success-message { color: #22c55e; font-size: 0.85rem; padding: 8px; background: rgba(34, 197, 94, 0.1); border-radius: 6px; margin-top: 8px; }
      </style>

      <div class="comments-widget">
        <div id="${listId}">
          <div class="loading-state"><div class="spinner"></div>Chargement des commentaires...</div>
        </div>
        ${this.currentUser ? `
          <div class="comment-input-area">
            <textarea id="${inputId}" class="comment-textarea" placeholder="Écrivez votre commentaire..." maxlength="1000"></textarea>
            <div class="char-counter"><span id="char-count-${this.contentId}">0</span> / 1000</div>
            <button id="comment-submit-btn-${this.contentId}" class="comment-submit">
              <i class="fas fa-paper-plane"></i> Publier
            </button>
            <div id="comment-feedback-${this.contentId}" style="color:#e74c3c; margin-top:8px; display:none;"></div>
          </div>
        ` : '<p style="text-align:center; margin-top:1rem; font-size:0.9rem; color: var(--text-secondary);">Veuillez vous <a href="connexion.html" style="color: #667eea; text-decoration: none; font-weight: 600;">connecter</a> pour commenter.</p>'}
      </div>
    `;
  },

  async refreshComments(initialComments = null) {
    const listId = this.contentType === 'video' ? `comments-list-video-${this.contentId}` : `comments-list-${this.contentId}`;
    const listContainer = document.getElementById(listId);
    if (!listContainer) return;
    
    if (!initialComments) {
      listContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    }

    try {
      let comments = initialComments;
      
      if (!comments) {
        const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
        const idField = this.contentType === 'video' ? 'video_id' : 'article_id';
        
        const { data, error } = await window.supabaseClient.supabase
          .from(tableName)
          .select(`*, users_profile(*)`)
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
      listContainer.innerHTML = '<div class="empty-state" style="color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement des commentaires.</p></div>';
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

  createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    
    const id = this.contentType === 'video' ? 
      (comment.comment_id ?? comment.id ?? 'unknown') : 
      (comment.session_id ?? comment.id ?? 'unknown');
    
    commentEl.id = `comment-${id}`;

    const author = comment.users_profile ?? { prenom: 'Utilisateur', nom: '', role: 'user', user_id: null };
    const initials = `${(author.prenom?.[0] ?? '?')}${(author.nom?.[0] ?? '')}`.toUpperCase();

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
          <button class="comment-btn share-btn" data-action="share" title="Partager ce commentaire">
            <i class="fas fa-share-alt"></i> Partager
          </button>
          ${canEdit ? `<button class="comment-btn" data-action="edit"><i class="fas fa-edit"></i> Modifier</button>` : ''}
          ${canDelete ? `<button class="comment-btn delete-btn" data-action="delete"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
        </div>
      </div>
    `;

    return commentEl;
  },

  hookCommentEvents(el, comment) {
    const id = this.contentType === 'video' ? 
      (comment.comment_id ?? comment.id) : 
      (comment.session_id ?? comment.id);
    
    const shareBtn = el.querySelector('[data-action="share"]');
    const editBtn = el.querySelector('[data-action="edit"]');
    const deleteBtn = el.querySelector('[data-action="delete"]');

    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareComment(comment));
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => this.openEditComment(el, comment));
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce commentaire définitivement ?')) return;
        try {
          const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
          const idField = this.contentType === 'video' ? 'comment_id' : 'session_id';
          
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

  shareComment(comment) {
    const text = comment.texte?.substring(0, 100) + (comment.texte?.length > 100 ? '...' : '');
    const commentId = this.contentType === 'video' ? 
      (comment.comment_id ?? comment.id) : 
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
        console.log('Partage annulé ou non supporté:', err);
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
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="comment-submit edit-save"><i class="fas fa-check"></i> Enregistrer</button>
        <button class="small-ghost edit-cancel"><i class="fas fa-times"></i> Annuler</button>
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
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
      
      try {
        const tableName = this.contentType === 'video' ? 'video_commentaires' : 'sessions_commentaires';
        const idField = this.contentType === 'video' ? 'comment_id' : 'session_id';
        const id = this.contentType === 'video' ? 
          (comment.comment_id ?? comment.id) : 
          (comment.session_id ?? comment.id);
        
        const { error } = await window.supabaseClient.supabase
          .from(tableName)
          .update({ texte: newText })
          .eq(idField, id);
        
        if (error) throw error;
        
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur modification commentaire:', err);
        feedback.textContent = 'Impossible de mettre à jour le commentaire.';
        feedback.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Enregistrer';
      }
    });
  },

  addEventListeners() {
    const inputId = this.contentType === 'video' ? `comment-input-video-${this.contentId}` : `comment-input-${this.contentId}`;
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

  async submitComment() {
    if (!this.currentUser) {
      alert('Connectez-vous pour publier un commentaire.');
      window.location.href = 'connexion.html';
      return;
    }
    
    const inputId = this.contentType === 'video' ? `comment-input-video-${this.contentId}` : `comment-input-${this.contentId}`;
    const textarea = this.container.querySelector(`#${inputId}`);
    const feedback = this.container.querySelector(`#comment-feedback-${this.contentId}`);
    const btn = this.container.querySelector(`#comment-submit-btn-${this.contentId}`);
    const charCount = this.container.querySelector(`#char-count-${this.contentId}`);
    
    if (!textarea || !btn) return;

    const texte = textarea.value.trim();
    if (!texte) {
      feedback.textContent = 'Écrivez un commentaire avant de publier.';
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
      feedback.textContent = '✅ Commentaire publié avec succès !';
      feedback.style.display = 'block';
      setTimeout(() => { feedback.style.display = 'none'; }, 3000);
      
      await this.refreshComments();
    } catch (err) {
      console.error('Erreur publication commentaire:', err);
      feedback.className = '';
      feedback.style.color = '#e74c3c';
      feedback.textContent = 'Impossible de publier le commentaire. Réessayez.';
      feedback.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publier';
    }
  },

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
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
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
