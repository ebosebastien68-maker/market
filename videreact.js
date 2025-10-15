// videreact.js - Gestion de l'affichage des utilisateurs qui ont réagi aux vidéos

(function() {
    'use strict';

    const VideoReactionsWidget = {
        supabase: null,
        currentUser: null,
        userProfile: null,
        videoId: null,
        allReactions: [], // Stocker toutes les réactions pour un filtrage rapide

        /**
         * Initialisation du widget
         */
        async init() {
            if (window.supabaseClient) {
                this.supabase = window.supabaseClient.supabase;
                this.currentUser = await window.supabaseClient.getCurrentUser();
                if (this.currentUser) {
                    this.userProfile = await window.supabaseClient.getUserProfile(this.currentUser.id);
                }
            }

            const urlParams = new URLSearchParams(window.location.search);
            this.videoId = urlParams.get('video_id');

            if (!this.videoId) {
                console.error("Aucun video_id fourni dans l'URL.");
                this.renderError("Erreur: ID de la vidéo manquant.");
                return;
            }
            await this.loadReactions();
        },

        /**
         * Chargement des réactions et des informations de la vidéo
         */
        async loadReactions() {
            const container = document.getElementById('video-reactions-container');
            container.innerHTML = `
                <div class="loader">
                    <div class="spinner"></div>
                    <p>Chargement des réactions...</p>
                </div>`;

            try {
                // Exécuter les deux requêtes en parallèle pour plus de performance
                const [reactionsResult, videoResult] = await Promise.all([
                    this.supabase
                        .from('video_reactions')
                        .select('*, users_profile(prenom, nom, user_id)')
                        .eq('video_id', this.videoId)
                        .order('date_created', { ascending: false }),
                    this.supabase
                        .from('videos')
                        .select('*, users_profile(prenom, nom)')
                        .eq('video_id', this.videoId)
                        .single()
                ]);

                if (reactionsResult.error) throw reactionsResult.error;
                if (videoResult.error) throw videoResult.error;

                this.allReactions = reactionsResult.data;
                this.renderPageLayout(container, this.allReactions, videoResult.data);

            } catch (error) {
                console.error('Erreur lors du chargement des réactions:', error);
                this.renderError("Impossible de charger les réactions pour cette vidéo.");
            }
        },

        /**
         * Affiche la structure complète de la page
         */
        renderPageLayout(container, reactions, video) {
            if (!reactions || reactions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart-broken"></i>
                        <h3>Aucune réaction</h3>
                        <p>Cette vidéo n'a pas encore reçu de réactions.</p>
                    </div>`;
                return;
            }
            
            const reactionsByType = this.groupReactionsByType(reactions);
            const totalUsers = new Set(reactions.map(r => r.user_id)).size;

            container.innerHTML = `
                <div class="video-info-header">
                    <div class="video-mini-card">
                        <div class="video-mini-author">
                            <div class="avatar-mini">${video.users_profile.prenom[0]}${video.users_profile.nom[0]}</div>
                            <div>
                                <h4>${video.users_profile.prenom} ${video.users_profile.nom}</h4>
                                <p>${this.formatDate(video.date_created, true)}</p>
                            </div>
                        </div>
                        <div class="video-mini-details">
                            <h5>${video.titre}</h5>
                            <p>${this.truncateText(video.description, 120)}</p>
                        </div>
                    </div>
                </div>

                <div class="reactions-summary">
                    <h3>
                        <i class="fas fa-chart-line"></i>
                        Résumé (${reactions.length} réactions par ${totalUsers} utilisateurs)
                    </h3>
                    <div class="reactions-stats">
                        ${this.renderReactionStat('like', 'thumbs-up', reactionsByType.like.length)}
                        ${this.renderReactionStat('love', 'heart', reactionsByType.love.length)}
                        ${this.renderReactionStat('rire', 'laugh-beam', reactionsByType.rire.length)}
                        ${this.renderReactionStat('colere', 'angry', reactionsByType.colere.length)}
                    </div>
                </div>

                <div class="reactions-tabs">
                    <button class="tab-btn active" data-type="all"><i class="fas fa-users"></i> Toutes (${totalUsers})</button>
                    <button class="tab-btn" data-type="like"><i class="fas fa-thumbs-up"></i> J'aime (${new Set(reactionsByType.like.map(r => r.user_id)).size})</button>
                    <button class="tab-btn" data-type="love"><i class="fas fa-heart"></i> Amour (${new Set(reactionsByType.love.map(r => r.user_id)).size})</button>
                    <button class="tab-btn" data-type="rire"><i class="fas fa-laugh-beam"></i> Rire (${new Set(reactionsByType.rire.map(r => r.user_id)).size})</button>
                    <button class="tab-btn" data-type="colere"><i class="fas fa-angry"></i> Colère (${new Set(reactionsByType.colere.map(r => r.user_id)).size})</button>
                </div>

                <div class="reactions-list" id="reactions-list"></div>
            `;
            
            this.renderGroupedUserList(reactions);
            this.initTabs();
        },
        
        /**
         * Regroupe les réactions par type
         */
        groupReactionsByType(reactions) {
            const grouped = { like: [], love: [], rire: [], colere: [] };
            reactions.forEach(reaction => {
                if (grouped[reaction.reaction_type]) {
                    grouped[reaction.reaction_type].push(reaction);
                }
            });
            return grouped;
        },

        /**
         * Génère le HTML pour une statistique de réaction
         */
        renderReactionStat(type, icon, count) {
            const colors = { like: '#3b82f6', love: '#ef4444', rire: '#f59e0b', colere: '#dc2626' };
            const labels = { like: 'J\'aime', love: 'Amour', rire: 'Rire', colere: 'Colère' };
            return `
                <div class="reaction-stat" style="border-left: 4px solid ${colors[type]};">
                    <i class="fas fa-${icon}" style="color: ${colors[type]};"></i>
                    <div class="stat-info">
                        <span class="stat-label">${labels[type]}</span>
                        <span class="stat-count">${count}</span>
                    </div>
                </div>`;
        },

        /**
         * Affiche la liste des utilisateurs regroupés par leurs réactions
         */
        renderGroupedUserList(reactions) {
            const listContainer = document.getElementById('reactions-list');
            if (!listContainer) return;

            // Ajoute une animation de "fondu sortant" avant de vider
            listContainer.style.opacity = '0';
            setTimeout(() => {
                if (reactions.length === 0) {
                    listContainer.innerHTML = `<div class="empty-state-small"><p>Aucun utilisateur dans cette catégorie.</p></div>`;
                    listContainer.style.opacity = '1';
                    return;
                }

                const usersData = {};
                reactions.forEach(reaction => {
                    if (!reaction.users_profile) return; // Sécurité
                    const userId = reaction.users_profile.user_id;
                    if (!usersData[userId]) {
                        usersData[userId] = {
                            profile: reaction.users_profile,
                            reactions: [],
                            latestDate: new Date(0)
                        };
                    }
                    usersData[userId].reactions.push({ type: reaction.reaction_type, date: new Date(reaction.date_created) });
                    if (new Date(reaction.date_created) > usersData[userId].latestDate) {
                        usersData[userId].latestDate = new Date(reaction.date_created);
                    }
                });

                const sortedUsers = Object.values(usersData).sort((a, b) => b.latestDate - a.latestDate);
                
                const reactionDetails = {
                    like: { icon: 'thumbs-up', color: '#3b82f6', label: 'J\'aime' },
                    love: { icon: 'heart', color: '#ef4444', label: 'Amour' },
                    rire: { icon: 'laugh-beam', color: '#f59e0b', label: 'Rire' },
                    colere: { icon: 'angry', color: '#dc2626', label: 'Colère' }
                };

                listContainer.innerHTML = sortedUsers.map((userData, index) => {
                    const user = userData.profile;
                    const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
                    userData.reactions.sort((a, b) => b.date - a.date);

                    const badgesHtml = userData.reactions.map(reaction => {
                        const info = reactionDetails[reaction.type];
                        return `<div class="reaction-badge" style="background: ${info.color};" title="${info.label} - ${this.formatDate(reaction.date)}">
                                    <i class="fas fa-${info.icon}"></i>
                                    <span>${info.label}</span>
                                </div>`;
                    }).join('');

                    return `<div class="reaction-item" style="animation-delay: ${index * 50}ms;">
                                <div class="reaction-user-info">
                                    <div class="avatar">${initials}</div>
                                    <div class="user-details">
                                        <h4>${user.prenom} ${user.nom}</h4>
                                        <p>Dernière réaction: ${this.formatDate(userData.latestDate)}</p>
                                    </div>
                                </div>
                                <div class="reaction-badges-container">${badgesHtml}</div>
                            </div>`;
                }).join('');

                listContainer.style.opacity = '1';
            }, 200); // Délai pour l'animation
        },

        /**
         * Initialise les événements de clic pour les onglets de filtre
         */
        initTabs() {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const type = tab.getAttribute('data-type');
                    const reactionsToDisplay = (type === 'all')
                        ? this.allReactions
                        : this.allReactions.filter(r => r.reaction_type === type);
                    
                    this.renderGroupedUserList(reactionsToDisplay);
                });
            });
        },
        
        /**
         * Affiche un message d'erreur
         */
        renderError(message) {
            document.getElementById('video-reactions-container').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erreur de chargement</h3>
                    <p>${message}</p>
                </div>`;
        },

        /**
         * Fonctions utilitaires
         */
        truncateText(text, maxLength) {
            if (!text || text.length <= maxLength) return text || '';
            return text.substring(0, maxLength) + '...';
        },

        formatDate(dateString, full = false) {
            const date = new Date(dateString);
            if (full) return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 7) return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (days > 0) return `Il y a ${days}j`;
            if (hours > 0) return `Il y a ${hours}h`;
            if (minutes > 0) return `Il y a ${minutes} min`;
            return "À l'instant";
        }
    };

    document.addEventListener('DOMContentLoaded', () => VideoReactionsWidget.init());
    window.VideoReactionsWidget = VideoReactionsWidget;
})();

