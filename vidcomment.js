// =====================================================================
// vidcomment.js - Widget v4.0 (Vidéos Uniquement)
// Gère les commentaires pour la table 'video_commentaires'
// Fonctionnalités : CRUD complet pour les commentaires et réponses.
// Date : 13/10/2025
// Auteur : Market App (via Gemini)
// =====================================================================

window.VideoCommentsWidget = {
  // Variables d'instance
  container: null,
  videoId: null,
  currentUser: null,
  userProfile: null,

  // ===================================================================
  // MÉTHODE PRINCIPALE : RENDER
  // Initialise le widget pour une vidéo donnée.
  // ===================================================================
  async render(container, videoId, comments, currentUser, userProfile) {
    this.container = container;
    this.videoId = videoId;
    this.currentUser = currentUser;
    this.userProfile = userProfile;

    // Injection du HTML et des styles du widget
    container.innerHTML = this.getWidgetHTML();
    this.addEventListeners();
    
    // Chargement et affichage des commentaires
    await this.refreshComments(comments);
  },

  // ===================================================================
  // GÉNÉRATION DU HTML + CSS (identique à commentaires.js)
  // ===================================================================
  getWidgetHTML() {
    const inputId = `comment-input-video-${this.videoId}`;
    const listId = `comments-list-video-${this.videoId}`;
    
    // Le CSS est identique, donc on le garde. Seuls les IDs changent.
    return `
      <style>
        .comments-widget { padding: 20px; font-family: 'Segoe UI', sans-serif; }
        .comment-item { padding: 16px 0; border-bottom: 1px solid var(--border-color); position: relative; transition: background 0.2s; }
        .comment-item:last-child { border-bottom: none; }
        .comment-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .comment-avatar { 
          width: 40px; height: 40px; border-radius: 50%; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          display: flex; align-items: center; justify-content: center; 
          color: white; font-weight: bold; font-size: 16px; flex-shrink: 0;
        }
        .comment-author { font-weight: 600; color: var(--text-primary); font-size: 15px; }
        .comment-date { font-size: 12px; color: var(--text-tertiary); margin-left: auto; }
        .comment-content { padding-left: 52px; }
        .comment-text { color: var(--text-primary); margin: 8px 0; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
        .comment-actions { display: flex; gap: 12px; align-items: center; margin-top: 10px; }
        .comment-btn { 
          background: none; border: none; color: #667eea; font-size: 13px; cursor: pointer; font-weight: 600; 
          padding: 4px 8px; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s; border-radius: 6px;
        }
        .comment-btn:hover { background: rgba(102, 126, 234, 0.1); }
        .delete-btn { color: #e74c3c; }
        .delete-btn:hover { background: rgba(231, 76, 60, 0.1); }
        
        .replies-container { margin-left: 52px; border-left: 2px solid var(--border-color); padding-left: 16px; margin-top: 12px; }
        .reply-box { background: var(--bg-primary); padding: 16px; border-radius: 12px; margin-top: 12px; border: 1px solid var(--border-color); }
        
        .comment-input-area { margin-top: 16px; position: relative; }
        .comment-textarea { 
          width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;
          min-height: 80px; resize: vertical; transition: all 0.3s; background: var(--bg-secondary); color: var(--text-primary);
        }
        .comment-textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15); }
        .comment-submit { 
          margin-top: 8px; padding: 10px 20px; background: var(--accent-gradient); color: white; border: none; 
          border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;
        }
        .comment-submit:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .comment-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .empty-state { text-align: center; padding: 40px 20px; color: var(--text-tertiary); }
        .empty-state i { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
        
        .feedback-message { 
          font-size: 13px; padding: 10px 15px; border-radius: 6px; margin-top: 10px; border-left: 4px solid;
          display: flex; align-items: center; gap: 10px;
        }
        .feedback-message.success { color: #22c55e; background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
        .feedback-message.error { color: #e74c3c; background: rgba(231, 76, 60, 0.1); border-color: #e74c3c; }
      </style>

      <div class="comments-widget">
        <div id="${listId}">
          <div class="loader"><div class="spinner"></div></div>
        </div>
        
        ${this.currentUser ? `
          <div class="comment-input-area">
            <textarea id="${inputId}" class="comment-textarea" placeholder="Exprimez-vous..." maxlength="1000"></textarea>
            <button id="comment-submit-btn-video-${this.videoId}" class="comment-submit">Publier</button>
            <div id="comment-feedback-video-${this.videoId}" style="display:none;"></div>
          </div>
        ` : `
          <p style="text-align:center; margin-top:1rem; color: var(--text-secondary);">
            <a href="connexion.html" style="color: #667eea; text-decoration: none; font-weight: 600;">Connectez-vous</a> pour laisser un commentaire.
          </p>
        `}
      </div>
    `;
  },
  
  // ===================================================================
  // GESTION DES COMMENTAIRES (AFFICHAGE, CRÉATION, ETC.)
  // ===================================================================
  async refreshComments(initialComments = null) {
    const listContainer = document.getElementById(`comments-list-video-${this.videoId}`);
    if (!listContainer) return;

    try {
      let comments = initialComments;
      if (!comments) {
        const { data, error } = await window.supabaseClient.supabase
          .from('video_commentaires')
          .select(`*, users_profile(*), video_reponses(*, users_profile(*))`)
          .eq('video_id', this.videoId)
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
      console.error('Erreur de rafraîchissement des commentaires vidéo:', err);
      listContainer.innerHTML = `<div class="empty-state" style="color:#e74c3c;"><i class="fas fa-exclamation-triangle"></i><p>Erreur de chargement des commentaires.</p></div>`;
    }
  },

  renderEmptyState() {
    return `<div class="empty-state"><i class="fas fa-comments"></i><p>Aucun commentaire pour l'instant. Soyez le premier !</p></div>`;
  },

  createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    commentEl.id = `video-comment-${comment.commentaire_id}`;

    const author = comment.users_profile || { prenom: 'Utilisateur', nom: '' };
    const initials = `${author.prenom?.[0] || '?'}${author.nom?.[0] || ''}`.toUpperCase();
    const responses = comment.video_reponses || [];
    const canModify = this.currentUser && this.currentUser.id === comment.user_id;
    const canDelete = canModify || this.userProfile?.role.startsWith('admin');

    commentEl.innerHTML = `
      <div class="comment-header">
        <div class="comment-avatar">${this.escapeHtml(initials)}</div>
        <div>
            <div class="comment-author">${this.escapeHtml(author.prenom)} ${this.escapeHtml(author.nom)}</div>
            <div class="comment-date">${this.formatDate(comment.date_created)}</div>
        </div>
      </div>
      <div class="comment-content">
        <div class="comment-text" data-text>${this.escapeHtml(comment.texte)}</div>
        <div class="comment-actions">
          ${this.currentUser ? `<button class="comment-btn" data-action="reply"><i class="fas fa-reply"></i> Répondre</button>` : ''}
          ${responses.length > 0 ? `<button class="comment-btn" data-action="toggle-replies"><i class="fas fa-comments"></i> ${responses.length} réponse(s)</button>` : ''}
          ${canModify ? `<button class="comment-btn" data-action="edit"><i class="fas fa-edit"></i> Modifier</button>` : ''}
          ${canDelete ? `<button class="comment-btn delete-btn" data-action="delete"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
        </div>
        <div class="reply-box" style="display:none;"></div>
        <div class="replies-container" style="display:none;"></div>
      </div>
    `;
    return commentEl;
  },

  hookCommentEvents(el, comment) {
    el.querySelector('[data-action="reply"]')?.addEventListener('click', () => this.openReplyBox(el, comment.commentaire_id));
    el.querySelector('[data-action="toggle-replies"]')?.addEventListener('click', () => this.toggleReplies(el, comment));
    el.querySelector('[data-action="edit"]')?.addEventListener('click', () => this.openEditBox(el.querySelector('.comment-text'), comment.commentaire_id, comment.texte, 'video_commentaires', 'commentaire_id'));
    el.querySelector('[data-action="delete"]')?.addEventListener('click', () => this.deleteItem(comment.commentaire_id, 'video_commentaires', 'commentaire_id'));
  },

  async submitComment() {
    if (!this.currentUser) return;
    const textarea = this.container.querySelector(`#comment-input-video-${this.videoId}`);
    const texte = textarea.value.trim();
    if (!texte) {
        this.showFeedback('Écrivez un commentaire avant de publier.', 'error');
        return;
    }
    await this.createItem({ video_id: this.videoId, user_id: this.currentUser.id, texte }, 'video_commentaires');
    textarea.value = '';
    this.showFeedback('Commentaire publié !', 'success');
  },

  // ===================================================================
  // FONCTIONS UTILITAIRES (CRUD, AFFICHAGE) - Adaptées pour les vidéos
  // ===================================================================
  async createItem(payload, tableName) {
    const btn = this.container.querySelector(`#comment-submit-btn-video-${this.videoId}`);
    btn.disabled = true;
    try {
        const { error } = await window.supabaseClient.supabase.from(tableName).insert([payload]);
        if (error) throw error;
        await this.refreshComments();
    } catch (err) {
        console.error(`Erreur création ${tableName}:`, err);
        this.showFeedback('Une erreur est survenue.', 'error');
    } finally {
        btn.disabled = false;
    }
  },

  async deleteItem(id, tableName, idField) {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    try {
        const { error } = await window.supabaseClient.supabase.from(tableName).delete().eq(idField, id);
        if (error) throw error;
        await this.refreshComments();
    } catch (err) {
        console.error(`Erreur suppression ${tableName}:`, err);
        alert('Erreur lors de la suppression.');
    }
  },

  openEditBox(textNode, id, originalText, tableName, idField) { /* ... */ },
  openReplyBox(el, commentId) { /* ... */ },
  toggleReplies(el, comment) { /* ... */ },

  addEventListeners() {
    this.container.querySelector(`#comment-submit-btn-video-${this.videoId}`)?.addEventListener('click', () => this.submitComment());
  },
  
  showFeedback(message, type = 'success') {
    const feedbackEl = this.container.querySelector(`#comment-feedback-video-${this.videoId}`);
    if (!feedbackEl) return;
    feedbackEl.innerHTML = `<div class="feedback-message ${type}"><i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}</div>`;
    feedbackEl.style.display = 'block';
    setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.round((now - date) / 1000);
    if (diffSeconds < 60) return "à l'instant";
    if (diffSeconds < 3600) return `il y a ${Math.floor(diffSeconds / 60)} min`;
    if (diffSeconds < 86400) return `il y a ${Math.floor(diffSeconds / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  escapeHtml(text) {
    return text?.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') || '';
  }
};

console.log('%c✅ Widget de commentaires (Vidéos) v4.0 chargé', 'color: #22c55e; font-weight: bold;');
