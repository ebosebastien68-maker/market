// =====================================================================
// vidcomment.js - Widget v5.0 (Vidéos Uniquement) - TOTALEMENT CORRIGÉ
// Gère les commentaires pour la table 'video_commentaires'
// Fonctionnalités : CRUD complet pour les commentaires et réponses.
// Date : 16/10/2025
// Corrections : Requêtes Supabase, gestion des événements, affichage
// =====================================================================

window.VideoCommentsWidget = {
  container: null,
  videoId: null,
  currentUser: null,
  userProfile: null,

  async render(container, videoId, comments, currentUser, userProfile) {
    this.container = container;
    this.videoId = videoId;
    this.currentUser = currentUser;
    this.userProfile = userProfile;

    container.innerHTML = this.getWidgetHTML();
    this.addEventListeners();
    
    // Si des commentaires sont déjà fournis, les afficher directement
    if (comments && comments.length > 0) {
      await this.refreshComments(comments);
    } else {
      await this.refreshComments();
    }
  },

  getWidgetHTML() {
    const inputId = `comment-input-video-${this.videoId}`;
    const listId = `comments-list-video-${this.videoId}`;
    
    return `
      <style>
        .comments-widget { padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .comment-item { padding: 16px 0; border-bottom: 1px solid var(--border-color); position: relative; transition: background 0.2s; }
        .comment-item:last-child { border-bottom: none; }
        .comment-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
        .comment-avatar { 
          width: 40px; height: 40px; border-radius: 50%; 
          background: var(--accent-gradient); 
          display: flex; align-items: center; justify-content: center; 
          color: white; font-weight: bold; font-size: 16px; flex-shrink: 0;
        }
        .comment-meta { flex-grow: 1; }
        .comment-author { font-weight: 600; color: var(--text-primary); font-size: 15px; }
        .comment-date { font-size: 12px; color: var(--text-tertiary); }
        .comment-content { padding-left: 52px; }
        .comment-text { color: var(--text-primary); margin: 0 0 8px 0; line-height: 1.6; white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
        .comment-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .comment-btn { 
          background: none; border: none; color: var(--accent-primary); font-size: 13px; cursor: pointer; font-weight: 600; 
          padding: 4px 8px; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s; border-radius: 6px;
        }
        .comment-btn:hover { background: var(--bg-tertiary); }
        .delete-btn { color: #e74c3c; }
        .delete-btn:hover { background: rgba(231, 76, 60, 0.1); }
        
        .replies-container { margin-left: 52px; border-left: 2px solid var(--border-color); padding-left: 16px; margin-top: 12px; }
        .reply-box { background: var(--bg-tertiary); padding: 16px; border-radius: 12px; margin-top: 12px; border: 1px solid var(--border-color); }
        
        .comment-input-area { margin-top: 16px; position: relative; }
        .comment-textarea { 
          width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px;
          min-height: 80px; resize: vertical; transition: all 0.3s; background: var(--bg-secondary); color: var(--text-primary);
          font-family: inherit;
        }
        .comment-textarea:focus { outline: none; border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15); }
        .comment-submit { 
          margin-top: 8px; padding: 10px 20px; background: var(--accent-gradient); color: white; border: none; 
          border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;
        }
        .comment-submit:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
        .comment-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .empty-state { text-align: center; padding: 40px 20px; color: var(--text-tertiary); }
        .empty-state i { font-size: 40px; margin-bottom: 15px; opacity: 0.5; }
        
        .feedback-message { font-size: 13px; padding: 10px 15px; border-radius: 6px; margin-top: 10px; border-left: 4px solid; display: flex; align-items: center; gap: 10px; animation: slideIn 0.3s ease; }
        .feedback-message.success { color: #22c55e; background: rgba(34, 197, 94, 0.1); border-color: #22c55e; }
        .feedback-message.error { color: #e74c3c; background: rgba(231, 76, 60, 0.1); border-color: #e74c3c; }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .edit-box { margin-top: 12px; padding: 16px; background: var(--bg-tertiary); border-radius: 12px; border: 1px solid var(--border-color); }
        
        .loader { display: flex; justify-content: center; align-items: center; padding: 20px; }
        .spinner { width: 30px; height: 30px; border: 3px solid var(--border-color); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>

      <div class="comments-widget">
        <div id="${listId}"><div class="loader"><div class="spinner"></div></div></div>
        ${this.currentUser ? `
          <div class="comment-input-area">
            <textarea id="${inputId}" class="comment-textarea" placeholder="Exprimez-vous..." maxlength="1000"></textarea>
            <button id="comment-submit-btn-video-${this.videoId}" class="comment-submit">
              <i class="fas fa-paper-plane"></i> Publier
            </button>
            <div id="comment-feedback-video-${this.videoId}" style="display:none;"></div>
          </div>
        ` : `
          <p style="text-align:center; margin-top:1rem; color: var(--text-secondary); font-size: 14px;">
            <a href="connexion.html" style="color: var(--accent-primary); text-decoration: none; font-weight: 600;">
              <i class="fas fa-sign-in-alt"></i> Connectez-vous
            </a> pour laisser un commentaire.
          </p>
        `}
      </div>
    `;
  },

  async refreshComments(initialComments = null) {
    const listContainer = document.getElementById(`comments-list-video-${this.videoId}`);
    if (!listContainer) return;
    
    try {
      let comments = initialComments;
      
      if (!comments) {
        // Requête Supabase corrigée avec les bonnes relations
        const { data, error } = await window.supabaseClient.supabase
          .from('video_commentaires')
          .select(`
            *,
            users_profile:user_id (
              prenom,
              nom,
              role
            ),
            video_reponses (
              *,
              users_profile:user_id (
                prenom,
                nom,
                role
              )
            )
          `)
          .eq('video_id', this.videoId)
          .order('date_created', { ascending: false });
          
        if (error) throw error;
        comments = data || [];
      }
      
      if (comments && comments.length > 0) {
        listContainer.innerHTML = comments.map(c => this.createCommentHTML(c)).join('');
        comments.forEach(c => this.hookCommentEvents(c));
      } else {
        listContainer.innerHTML = this.renderEmptyState();
      }
    } catch (err) {
      console.error('Erreur de rafraîchissement des commentaires vidéo:', err);
      listContainer.innerHTML = `
        <div class="empty-state" style="color:#e74c3c;">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erreur de chargement des commentaires.</p>
        </div>`;
    }
  },

  renderEmptyState() {
    return `
      <div class="empty-state">
        <i class="fas fa-video"></i>
        <p>Aucun commentaire pour le moment.</p>
        <p style="font-size: 13px; margin-top: 8px;">Soyez le premier à partager votre avis !</p>
      </div>`;
  },

  createCommentHTML(comment, isReply = false) {
    const author = comment.users_profile || { prenom: 'Utilisateur', nom: 'Anonyme' };
    const initials = `${author.prenom?.[0] || '?'}${author.nom?.[0] || ''}`.toUpperCase();
    const responses = comment.video_reponses || [];
    const canModify = this.currentUser && this.currentUser.id === comment.user_id;
    const canDelete = canModify || (this.userProfile?.role === 'adminpro') || (this.userProfile?.role === 'admin' && author.role !== 'adminpro');
    const commentId = isReply ? comment.reponse_id : comment.commentaire_id;

    return `
      <div class="comment-item" id="video-comment-${commentId}">
        <div class="comment-header">
          <div class="comment-avatar">${this.escapeHtml(initials)}</div>
          <div class="comment-meta">
            <div class="comment-author">${this.escapeHtml(author.prenom)} ${this.escapeHtml(author.nom)}</div>
            <div class="comment-date">${this.formatDate(comment.date_created)}</div>
          </div>
        </div>
        <div class="comment-content">
          <div class="comment-text" data-text>${this.escapeHtml(comment.texte)}</div>
          <div class="comment-actions">
            ${this.currentUser && !isReply ? `
              <button class="comment-btn" data-action="reply" data-id="${commentId}">
                <i class="fas fa-reply"></i> Répondre
              </button>
            ` : ''}
            ${!isReply && responses.length > 0 ? `
              <button class="comment-btn" data-action="toggle-replies" data-id="${commentId}">
                <i class="fas fa-comments"></i> ${responses.length} réponse${responses.length > 1 ? 's' : ''}
              </button>
            ` : ''}
            ${canModify ? `
              <button class="comment-btn" data-action="edit" data-id="${commentId}">
                <i class="fas fa-edit"></i> Modifier
              </button>
            ` : ''}
            ${canDelete ? `
              <button class="comment-btn delete-btn" data-action="delete" data-id="${commentId}">
                <i class="fas fa-trash"></i> Supprimer
              </button>
            ` : ''}
          </div>
          ${!isReply ? `
            <div class="reply-box" id="video-reply-box-${commentId}" style="display:none;"></div>
            <div class="replies-container" id="video-replies-${commentId}" style="display:none;"></div>
          ` : ''}
        </div>
      </div>
    `;
  },

  hookCommentEvents(comment) {
    const el = document.getElementById(`video-comment-${comment.commentaire_id}`);
    if (!el) return;

    // Bouton Répondre
    const replyBtn = el.querySelector('[data-action="reply"]');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => this.openReplyBox(comment.commentaire_id));
    }

    // Bouton Afficher les réponses
    const toggleBtn = el.querySelector('[data-action="toggle-replies"]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleReplies(comment));
    }

    // Bouton Modifier
    const editBtn = el.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const textNode = el.querySelector('.comment-text');
        this.openEditBox(textNode, comment.commentaire_id, comment.texte, 'video_commentaires', 'commentaire_id');
      });
    }

    // Bouton Supprimer
    const deleteBtn = el.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteItem(comment.commentaire_id, 'video_commentaires', 'commentaire_id');
      });
    }
  },

  async submitComment() {
    if (!this.currentUser) {
      this.showFeedback('Vous devez être connecté pour commenter.', 'error');
      return;
    }
    
    const textarea = this.container.querySelector(`#comment-input-video-${this.videoId}`);
    if (!textarea) {
      console.error('Textarea introuvable pour vidéo:', this.videoId);
      return;
    }
    
    const texte = textarea.value.trim();
    if (!texte) {
      this.showFeedback('Écrivez un commentaire avant de publier.', 'error');
      return;
    }
    
    const btn = this.container.querySelector(`#comment-submit-btn-video-${this.videoId}`);
    if (btn) btn.disabled = true;
    
    try {
      console.log('📤 Envoi commentaire vidéo:', { video_id: this.videoId, user_id: this.currentUser.id, texte });
      
      const { data, error } = await window.supabaseClient.supabase
        .from('video_commentaires')
        .insert({
          video_id: this.videoId,
          user_id: this.currentUser.id,
          texte: texte
        })
        .select();
        
      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }
      
      console.log('✅ Commentaire vidéo publié:', data);
      
      textarea.value = '';
      this.showFeedback('Commentaire publié avec succès !', 'success');
      
      // Rafraîchir après un court délai
      setTimeout(() => this.refreshComments(), 300);
    } catch (err) {
      console.error('❌ Erreur publication commentaire vidéo:', err);
      this.showFeedback(`Erreur: ${err.message || 'Impossible de publier'}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  },
  
  openReplyBox(commentId) {
    const replyBox = document.getElementById(`video-reply-box-${commentId}`);
    if (!replyBox) return;
    
    if (replyBox.style.display === 'block') {
      replyBox.style.display = 'none';
      replyBox.innerHTML = '';
      return;
    }
    
    replyBox.style.display = 'block';
    replyBox.innerHTML = `
      <textarea class="comment-textarea" placeholder="Écrivez votre réponse..." maxlength="1000"></textarea>
      <button class="comment-submit" style="margin-top: 8px;">
        <i class="fas fa-reply"></i> Répondre
      </button>
    `;
    
    const submitBtn = replyBox.querySelector('button');
    submitBtn.addEventListener('click', async () => {
      const textarea = replyBox.querySelector('textarea');
      const texte = textarea.value.trim();
      
      if (!texte) {
        alert('Écrivez une réponse avant de publier.');
        return;
      }
      
      submitBtn.disabled = true;
      
      try {
        const { error } = await window.supabaseClient.supabase
          .from('video_reponses')
          .insert({
            commentaire_id: commentId,
            user_id: this.currentUser.id,
            texte: texte
          });
          
        if (error) throw error;
        
        replyBox.style.display = 'none';
        replyBox.innerHTML = '';
        await this.refreshComments();
      } catch (err) {
        console.error('Erreur publication réponse vidéo:', err);
        alert('Erreur lors de la publication de la réponse.');
      } finally {
        submitBtn.disabled = false;
      }
    });
  },
  
  toggleReplies(comment) {
    const repliesContainer = document.getElementById(`video-replies-${comment.commentaire_id}`);
    if (!repliesContainer) return;
    
    const isVisible = repliesContainer.style.display === 'block';
    
    if (isVisible) {
      repliesContainer.style.display = 'none';
    } else {
      repliesContainer.style.display = 'block';
      
      if (!repliesContainer.hasAttribute('data-loaded')) {
        const responses = comment.video_reponses || [];
        
        if (responses.length > 0) {
          repliesContainer.innerHTML = responses
            .sort((a, b) => new Date(a.date_created) - new Date(b.date_created))
            .map(reply => this.createCommentHTML(reply, true))
            .join('');
            
          repliesContainer.setAttribute('data-loaded', 'true');
          
          // Hook events pour les réponses
          responses.forEach(reply => {
            const replyEl = document.getElementById(`video-comment-${reply.reponse_id}`);
            if (!replyEl) return;
            
            const editBtn = replyEl.querySelector('[data-action="edit"]');
            if (editBtn) {
              editBtn.addEventListener('click', () => {
                const textNode = replyEl.querySelector('.comment-text');
                this.openEditBox(textNode, reply.reponse_id, reply.texte, 'video_reponses', 'reponse_id');
              });
            }
            
            const deleteBtn = replyEl.querySelector('[data-action="delete"]');
            if (deleteBtn) {
              deleteBtn.addEventListener('click', () => {
                this.deleteItem(reply.reponse_id, 'video_reponses', 'reponse_id');
              });
            }
          });
        }
      }
    }
  },

  openEditBox(textNode, id, originalText, tableName, idField) {
    const contentDiv = textNode.parentElement;
    
    // Vérifier si une edit-box existe déjà
    const existingEdit = contentDiv.querySelector('.edit-box');
    if (existingEdit) return;
    
    contentDiv.style.display = 'none';

    const editDiv = document.createElement('div');
    editDiv.className = 'edit-box';
    editDiv.innerHTML = `
      <textarea class="comment-textarea" style="min-height: 60px;">${this.escapeHtml(originalText)}</textarea>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="comment-submit">
          <i class="fas fa-save"></i> Sauvegarder
        </button>
        <button class="comment-btn" style="background:var(--bg-tertiary);">
          <i class="fas fa-times"></i> Annuler
        </button>
      </div>
    `;
    contentDiv.parentNode.insertBefore(editDiv, contentDiv.nextSibling);

    const [saveBtn, cancelBtn] = editDiv.querySelectorAll('button');
    const textarea = editDiv.querySelector('textarea');
    
    saveBtn.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      
      if (!newText) {
        alert('Le commentaire ne peut pas être vide.');
        return;
      }
      
      if (newText === originalText) {
        editDiv.remove();
        contentDiv.style.display = 'block';
        return;
      }
      
      saveBtn.disabled = true;
      
      try {
        const { error } = await window.supabaseClient.supabase
          .from(tableName)
          .update({ texte: newText })
          .eq(idField, id);
          
        if (error) throw error;
        
        await this.refreshComments();
      } catch (err) {
        console.error(`Erreur mise à jour ${tableName}:`, err);
        alert('Erreur lors de la mise à jour.');
        editDiv.remove();
        contentDiv.style.display = 'block';
      } finally {
        saveBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener('click', () => {
      editDiv.remove();
      contentDiv.style.display = 'block';
    });
  },

  async deleteItem(id, tableName, idField) {
    if (!confirm('Voulez-vous vraiment supprimer cet élément ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const { error } = await window.supabaseClient.supabase
        .from(tableName)
        .delete()
        .eq(idField, id);
        
      if (error) throw error;
      
      await this.refreshComments();
      this.showFeedback('Élément supprimé avec succès.', 'success');
    } catch (err) {
      console.error(`Erreur suppression ${tableName}:`, err);
      alert('Erreur lors de la suppression.');
    }
  },

  addEventListeners() {
    const submitBtn = this.container.querySelector(`#comment-submit-btn-video-${this.videoId}`);
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.submitComment());
    }
    
    // Permettre la soumission avec Ctrl+Enter
    const textarea = this.container.querySelector(`#comment-input-video-${this.videoId}`);
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.submitComment();
        }
      });
    }
  },
  
  showFeedback(message, type = 'success') {
    const feedbackEl = this.container.querySelector(`#comment-feedback-video-${this.videoId}`);
    if (!feedbackEl) return;
    
    feedbackEl.innerHTML = `
      <div class="feedback-message ${type}">
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> 
        ${message}
      </div>`;
    feedbackEl.style.display = 'block';
    
    setTimeout(() => { 
      feedbackEl.style.display = 'none';
      feedbackEl.innerHTML = '';
    }, 3000);
  },

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.round((now - date) / 1000);
    
    if (diff < 60) return "à l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
    if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  },

  escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

console.log('%c✅ Widget de commentaires (Vidéos) v5.0 - TOTALEMENT CORRIGÉ', 'color: #22c55e; font-weight: bold; font-size: 14px;');
console.log('%c📋 Fonctionnalités:', 'color: #667eea; font-weight: bold;');
console.log('  ✓ Affichage des commentaires et réponses');
console.log('  ✓ Publication de commentaires');
console.log('  ✓ Répondre aux commentaires');
console.log('  ✓ Modifier ses commentaires');
console.log('  ✓ Supprimer (avec droits)');
console.log('  ✓ Gestion des permissions (user/admin/adminpro)');
console.log('  ✓ Requêtes Supabase corrigées');
console.log('  ✓ Gestion des événements améliorée');
console.log('  ✓ Design moderne et responsive');
