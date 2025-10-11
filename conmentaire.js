// commentaires.js - Widget de commentaires réutilisable

window.CommentsWidget = {
    // MISE À JOUR : Ajout de userProfile pour gérer les permissions (rôles)
    async render(container, articleId, comments, currentUser, userProfile) {
        this.container = container;
        this.articleId = articleId;
        this.currentUser = currentUser;
        this.userProfile = userProfile;

        container.innerHTML = `
            <style>
                .comments-widget { padding: 20px; }
                .comment-item { padding: 15px; border-bottom: 1px solid #f0f0f0; position: relative; }
                .comment-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
                .comment-avatar { width: 35px; height: 35px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0; }
                .comment-author { font-weight: 600; color: #333; }
                .comment-date { font-size: 12px; color: #999; margin-left: auto; }
                .comment-text { color: #333; margin: 8px 0; padding-left: 45px; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
                .comment-actions { padding-left: 45px; display: flex; gap: 15px; align-items: center; }
                .comment-btn { background: none; border: none; color: #667eea; font-size: 13px; cursor: pointer; font-weight: 600; padding: 5px; }
                .comment-btn:hover { text-decoration: underline; }
                .delete-btn { color: #ff4757; }
                .replies-container { margin-left: 45px; border-left: 2px solid #f0f0f0; padding-left: 15px; margin-top: 10px; }
                .reply-item { padding: 10px 0; }
                .comment-input-box { margin-top: 15px; }
                .comment-textarea { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px; font-family: inherit; font-size: 14px; min-height: 80px; resize: vertical; transition: border-color 0.3s; }
                .comment-textarea:focus { outline: none; border-color: #667eea; }
                .comment-submit { margin-top: 10px; padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: transform 0.2s; }
                .comment-submit:hover { transform: translateY(-2px); }
                .no-comments { text-align: center; padding: 40px 20px; color: #999; }
            </style>
            
            <div class="comments-widget">
                <div id="comments-list-${articleId}">
                    ${await this.renderCommentsList(comments)}
                </div>
                
                ${currentUser ? `
                    <div class="comment-input-box">
                        <textarea id="comment-input-${articleId}" class="comment-textarea" placeholder="Écrivez votre commentaire..."></textarea>
                        <button class="comment-submit" onclick="CommentsWidget.submitComment()">
                            <i class="fas fa-paper-plane"></i> Publier
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    async renderCommentsList(comments) {
        if (comments.length === 0) {
            return `<div class="no-comments"><i class="fas fa-comments" style="font-size: 40px; margin-bottom: 10px; display: block;"></i><p>Aucun commentaire pour le moment</p><p style="font-size: 13px; margin-top: 5px;">Soyez le premier à commenter !</p></div>`;
        }

        let html = '';
        for (const comment of comments) {
            const author = comment.users_profile;
            const initials = `${author.prenom[0] || ''}${author.nom[0] || ''}`.toUpperCase();
            
            // MISE À JOUR : Permissions
            const canEdit = this.currentUser && this.currentUser.id === comment.user_id;
            const canDelete = this.userProfile && (
                this.userProfile.user_id === comment.user_id ||
                this.userProfile.role === 'adminpro' ||
                (this.userProfile.role === 'admin' && author.role === 'user')
            );
            
            html += `
                <div class="comment-item" id="comment-${comment.session_id}">
                    <div class="comment-header">
                        <div class="comment-avatar">${initials}</div>
                        <span class="comment-author">${author.prenom} ${author.nom}</span>
                        <span class="comment-date">${this.formatDate(comment.date_created)}</span>
                    </div>

                    <div id="comment-text-view-${comment.session_id}">
                        <div class="comment-text">${this.escapeHtml(comment.texte)}</div>
                        <div class="comment-actions">
                            ${this.currentUser ? `<button class="comment-btn" onclick="CommentsWidget.toggleReplyBox('${comment.session_id}')"><i class="fas fa-reply"></i> Répondre</button>` : ''}
                            ${comment.session_reponses.length > 0 ? `<button class="comment-btn" onclick="CommentsWidget.toggleReplies('${comment.session_id}')"><i class="fas fa-comment"></i> ${comment.session_reponses.length} réponse(s)</button>` : ''}
                            ${canEdit ? `<button class="comment-btn" onclick="CommentsWidget.toggleEditView('comment', '${comment.session_id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                            ${canDelete ? `<button class="comment-btn delete-btn" onclick="CommentsWidget.deleteItem('comment', '${comment.session_id}')"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
                        </div>
                    </div>
                    
                    ${canEdit ? `
                        <div id="comment-edit-view-${comment.session_id}" style="display:none; padding-left: 45px; margin-top:10px;">
                            <textarea class="comment-textarea">${this.escapeHtml(comment.texte)}</textarea>
                            <button class="comment-submit" onclick="CommentsWidget.saveEdit('comment', '${comment.session_id}')">Enregistrer</button>
                            <button class="comment-btn" onclick="CommentsWidget.toggleEditView('comment', '${comment.session_id}')">Annuler</button>
                        </div>
                    ` : ''}

                    <div id="reply-box-${comment.session_id}" style="display: none; margin-top: 10px; padding-left: 45px;">
                        <textarea id="reply-input-${comment.session_id}" class="comment-textarea" placeholder="Écrivez votre réponse..." style="min-height: 60px;"></textarea>
                        <button class="comment-submit" onclick="CommentsWidget.submitReply('${comment.session_id}')" style="margin-top: 8px;">Répondre</button>
                    </div>
                    
                    <div id="replies-${comment.session_id}" class="replies-container" style="display: none;">
                        ${comment.session_reponses.map(reply => this.renderReply(reply)).join('')}
                    </div>
                </div>
            `;
        }
        return html;
    },
    
    renderReply(reply) {
        const author = reply.users_profile;
        const initials = `${author.prenom[0] || ''}${author.nom[0] || ''}`.toUpperCase();
        
        const canEdit = this.currentUser && this.currentUser.id === reply.user_id;
        const canDelete = this.userProfile && (
            this.userProfile.user_id === reply.user_id ||
            this.userProfile.role === 'adminpro' ||
            (this.userProfile.role === 'admin' && author.role === 'user')
        );

        return `
            <div class="reply-item" id="reply-${reply.reponse_id}">
                 <div id="reply-text-view-${reply.reponse_id}">
                    <div class="comment-header">
                        <div class="comment-avatar" style="width: 30px; height: 30px; font-size: 12px;">${initials}</div>
                        <span class="comment-author" style="font-size: 14px;">${author.prenom} ${author.nom}</span>
                        <span class="comment-date">${this.formatDate(reply.date_created)}</span>
                    </div>
                    <div class="comment-text" style="font-size: 14px;">${this.escapeHtml(reply.texte)}</div>
                     <div class="comment-actions">
                        ${canEdit ? `<button class="comment-btn" onclick="CommentsWidget.toggleEditView('reply', '${reply.reponse_id}')"><i class="fas fa-edit"></i> Modifier</button>` : ''}
                        ${canDelete ? `<button class="comment-btn delete-btn" onclick="CommentsWidget.deleteItem('reply', '${reply.reponse_id}')"><i class="fas fa-trash"></i> Supprimer</button>` : ''}
                    </div>
                </div>
                ${canEdit ? `
                    <div id="reply-edit-view-${reply.reponse_id}" style="display:none; margin-top:10px;">
                        <textarea class="comment-textarea" style="font-size:14px;">${this.escapeHtml(reply.texte)}</textarea>
                        <button class="comment-submit" onclick="CommentsWidget.saveEdit('reply', '${reply.reponse_id}')">Enregistrer</button>
                        <button class="comment-btn" onclick="CommentsWidget.toggleEditView('reply', '${reply.reponse_id}')">Annuler</button>
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    async refreshComments() {
        const { supabase } = window.supabaseClient;
        const listContainer = document.getElementById(`comments-list-${this.articleId}`);
        listContainer.innerHTML = '<p style="text-align:center;padding:20px;">Chargement...</p>';
        
        const { data: comments, error } = await supabase
            .from('sessions_commentaires')
            .select(`*, users_profile(*), session_reponses(*, users_profile(*))`)
            .eq('article_id', this.articleId)
            .order('date_created', { ascending: false });
        
        if (error) {
            console.error('Erreur de rafraîchissement:', error);
            listContainer.innerHTML = '<p style="text-align:center;padding:20px;color:red;">Erreur de chargement.</p>';
            return;
        }

        listContainer.innerHTML = await this.renderCommentsList(comments);
    },

    async submitComment() {
        const { supabase } = window.supabaseClient;
        const input = document.getElementById(`comment-input-${this.articleId}`);
        const texte = input.value.trim();
        if (!texte) return;

        try {
            await supabase.from('sessions_commentaires').insert({
                article_id: this.articleId,
                user_id: this.currentUser.id,
                texte: texte
            });
            input.value = '';
            await this.refreshComments();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la publication du commentaire.');
        }
    },

    async submitReply(sessionId) {
        const { supabase } = window.supabaseClient;
        const input = document.getElementById(`reply-input-${sessionId}`);
        const texte = input.value.trim();
        if (!texte) return;

        try {
            await supabase.from('session_reponses').insert({
                session_id: sessionId,
                user_id: this.currentUser.id,
                texte: texte
            });
            await this.refreshComments();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la publication de la réponse.');
        }
    },
    
    async deleteItem(type, id) {
        if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;

        const table = type === 'comment' ? 'sessions_commentaires' : 'session_reponses';
        const column = type === 'comment' ? 'session_id' : 'reponse_id';
        
        try {
            const { error } = await window.supabaseClient.supabase.from(table).delete().eq(column, id);
            if (error) throw error;
            await this.refreshComments();
        } catch (error) {
            console.error('Erreur de suppression:', error);
            alert("Erreur: Vous n'avez peut-être pas la permission de supprimer cet élément.");
        }
    },
    
    toggleEditView(type, id) {
        const textView = document.getElementById(`${type}-text-view-${id}`);
        const editView = document.getElementById(`${type}-edit-view-${id}`);
        textView.style.display = textView.style.display === 'none' ? 'block' : 'none';
        editView.style.display = editView.style.display === 'none' ? 'block' : 'none';
    },

    async saveEdit(type, id) {
        const table = type === 'comment' ? 'sessions_commentaires' : 'session_reponses';
        const column = type === 'comment' ? 'session_id' : 'reponse_id';
        const textarea = document.querySelector(`#${type}-edit-view-${id} textarea`);
        const texte = textarea.value.trim();
        if (!texte) return;

        try {
            const { error } = await window.supabaseClient.supabase.from(table).update({ texte }).eq(column, id);
            if (error) throw error;
            await this.refreshComments();
        } catch (error) {
            console.error('Erreur de modification:', error);
            alert("Erreur: Vous n'avez peut-être pas la permission de modifier cet élément.");
        }
    },

    toggleReplyBox(sessionId) {
        const box = document.getElementById(`reply-box-${sessionId}`);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    },

    toggleReplies(sessionId) {
        const replies = document.getElementById(`replies-${sessionId}`);
        replies.style.display = replies.style.display === 'none' ? 'block' : 'none';
    },

    // ... Les fonctions formatDate et escapeHtml restent inchangées ...
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 7) return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
        if (days > 0) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
        return 'À l\'instant';
    },
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
