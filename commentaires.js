// commentaires.js - Widget de commentaires moderne et réutilisable

window.CommentsWidget = {
    // Initialise et affiche le widget dans le conteneur spécifié
    async render(container, contentId, contentType, currentUser, userProfile) {
        this.container = container;
        this.contentId = contentId; // article_id ou video_id
        this.contentType = contentType; // 'article' ou 'video'
        this.currentUser = currentUser;
        this.userProfile = userProfile;

        // Injection du style et de la structure HTML du widget
        container.innerHTML = this.getWidgetHTML();

        // Ajout des écouteurs d'événements pour l'interactivité
        this.addEventListeners();

        // Chargement initial des commentaires
        await this.refreshComments();
    },

    // Structure HTML principale du widget
    getWidgetHTML() {
        return `
            <style>
                .comments-widget { padding: 1.25rem; font-family: 'Segoe UI', sans-serif; }
                .comment-item { padding: 1rem 0; border-bottom: 1px solid #eef0f2; position: relative; }
                .comment-item:last-child { border-bottom: none; }
                .comment-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
                .comment-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem; flex-shrink: 0; }
                .comment-author { font-weight: 600; color: #1c1e21; }
                .comment-date { font-size: 0.75rem; color: #8a9199; margin-left: auto; }
                .comment-content { padding-left: calc(38px + 0.75rem); }
                .comment-text { color: #1c1e21; margin: 0.5rem 0; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
                .comment-actions { display: flex; gap: 1rem; align-items: center; }
                .comment-btn { background: none; border: none; color: #667eea; font-size: 0.8rem; cursor: pointer; font-weight: 600; padding: 0.25rem; display: inline-flex; align-items: center; gap: 0.25rem; }
                .comment-btn:hover { text-decoration: underline; }
                .delete-btn { color: #e74c3c; }
                .replies-container { margin-left: calc(38px + 0.75rem); border-left: 2px solid #eef0f2; padding-left: 1rem; margin-top: 0.75rem; }
                .reply-item { padding: 0.75rem 0; }
                .comment-input-area { margin-top: 1rem; position: relative; }
                .comment-textarea { width: 100%; padding: 0.75rem; border: 1px solid #ced0d4; border-radius: 8px; font-family: inherit; font-size: 0.9rem; min-height: 80px; resize: vertical; transition: border-color 0.3s; }
                .comment-textarea:focus { outline: none; border-color: #667eea; }
                .char-counter { font-size: 0.75rem; color: #8a9199; text-align: right; margin-top: 0.25rem; }
                .comment-submit { margin-top: 0.5rem; padding: 0.6rem 1.25rem; background: #0866ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background-color 0.2s, transform 0.2s; }
                .comment-submit:hover { background-color: #0655d4; transform: translateY(-1px); }
                .empty-state, .loading-state { text-align: center; padding: 2.5rem 1.25rem; color: #8a9199; }
                .spinner { border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 0.5rem; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
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
                    </div>
                ` : '<p style="text-align:center; margin-top:1rem; font-size:0.9rem;">Veuillez vous <a href="connexion.html">connecter</a> pour commenter.</p>'}
            </div>
        `;
    },

    // Gère le rendu de la liste des commentaires
    async renderCommentsList(comments) {
        if (!comments || comments.length === 0) {
            return `<div class="empty-state"><i class="fas fa-comments" style="font-size: 2.5rem; margin-bottom: 0.75rem; display: block;"></i><p>Aucun commentaire pour le moment</p><p style="font-size: 0.8rem; margin-top: 0.25rem;">Soyez le premier à commenter !</p></div>`;
        }
        // Le rendu de chaque commentaire individuel sera géré dynamiquement
    },

    // Logique pour rafraîchir et afficher la liste complète des commentaires
    async refreshComments() {
        const listContainer = document.getElementById(`comments-list-${this.contentId}`);
        listContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
        
        try {
            // Note: Le widget de commentaires ne supporte que les articles pour l'instant
            // La logique pour les vidéos peut être ajoutée en modifiant la table source ici.
            const { data: comments, error } = await window.supabaseClient.supabase
                .from('sessions_commentaires')
                .select(`*, users_profile(*), session_reponses(*, users_profile(*))`)
                .eq('article_id', this.contentId)
                .order('date_created', { ascending: false });

            if (error) throw error;
            
            listContainer.innerHTML = ''; // Vide le conteneur avant d'ajouter les nouveaux éléments
            if (comments.length === 0) {
                listContainer.innerHTML = await this.renderCommentsList(comments);
            } else {
                comments.forEach(comment => listContainer.appendChild(this.createCommentElement(comment)));
            }
        } catch (error) {
            console.error('Erreur de rafraîchissement:', error);
            listContainer.innerHTML = '<div class="empty-state" style="color: #e74c3c;">Erreur de chargement des commentaires.</div>';
        }
    },

    // Crée un élément DOM pour un seul commentaire
    createCommentElement(comment) {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.id = `comment-${comment.session_id}`;

        const author = comment.users_profile || { prenom: 'Utilisateur', nom: 'Supprimé', role: 'user' };
        const initials = `${author.prenom[0] || '?'}${author.nom[0] || ''}`.toUpperCase();
        
        const canEdit = this.currentUser && this.currentUser.id === comment.user_id;
        const canDelete = this.userProfile && (
            this.userProfile.user_id === comment.user_id ||
            this.userProfile.role === 'adminpro' ||
            (this.userProfile.role === 'admin' && author.role === 'user')
        );

        commentEl.innerHTML = `
            <div class="comment-header">
                <div class="comment-avatar">${initials}</div>
                <span class="comment-author">${author.prenom} ${author.nom}</span>
                <span class="comment-date">${this.formatDate(comment.date_created)}</span>
            </div>
            <div class="comment-content">
                <div class="comment-text">${this.escapeHtml(comment.texte)}</div>
                <div class="comment-actions">
                    ${this.currentUser ? `<button class="comment-btn" data-action="toggle-reply"><i class="fas fa-reply"></i> Répondre</button>` : ''}
                    ${comment.session_reponses.length > 0 ? `<button class="comment-btn" data-action="toggle-replies"><i class="fas fa-comment-dots"></i> ${comment.session_reponses.length} réponse(s)</button>` : ''}
                    ${canEdit ? `<button class="comment-btn" data-action="edit"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                    ${canDelete ? `<button class="comment-btn delete-btn" data-action="delete"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
                </div>
                <div class="reply-box" style="display: none;"></div>
                <div class="replies-container" style="display: none;"></div>
            </div>`;

        return commentEl;
    },

    // Ajoute les écouteurs d'événements principaux
    addEventListeners() {
        const commentInput = this.container.querySelector('#comment-input');
        const submitBtn = this.container.querySelector('#comment-submit-btn');
        const charCount = this.container.querySelector('#char-count');

        if (commentInput) {
            commentInput.addEventListener('input', () => {
                charCount.textContent = commentInput.value.length;
            });
        }
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitComment());
        }
    },

    // ... Le reste des fonctions (submitComment, submitReply, deleteItem, etc.) sera adapté ...
    // ... pour fonctionner avec le nouveau système d'événements et de rendu. ...
    
    // Fonctions utilitaires
    formatDate(dateString) {
        // ... (inchangé) ...
    },
    escapeHtml(text) {
        // ... (inchangé) ...
    }
};

