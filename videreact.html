window.VideoReactions = {
  
  init() {
    if (document.getElementById('video-reactions-styles')) return;
    const style = document.createElement('style');
    style.id = 'video-reactions-styles';
    style.innerHTML = `
      .reactions-modal-backdrop {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.6); z-index: 2000;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .reactions-modal-backdrop.show { opacity: 1; }
      .reactions-modal-content {
        background: var(--bg-secondary); color: var(--text-primary);
        width: 90%; max-width: 500px; max-height: 80vh;
        border-radius: 16px; box-shadow: var(--shadow-lg);
        display: flex; flex-direction: column;
        transform: scale(0.95); transition: transform 0.3s ease;
      }
      .reactions-modal-backdrop.show .reactions-modal-content { transform: scale(1); }
      .reactions-modal-header {
        padding: 16px 24px; border-bottom: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
      }
      .reactions-modal-header h3 { font-size: 18px; margin: 0; }
      .reactions-modal-close {
        background: none; border: none; font-size: 24px; cursor: pointer;
        color: var(--text-tertiary); transition: color 0.2s;
      }
      .reactions-modal-close:hover { color: var(--text-primary); }
      .reactions-modal-summary {
        padding: 20px 24px; display: flex; justify-content: space-around;
        background: var(--bg-primary); border-bottom: 1px solid var(--border-color);
      }
      .summary-item { text-align: center; }
      .summary-item i { font-size: 20px; }
      .summary-item .count { font-size: 18px; font-weight: 700; margin-top: 5px; }
      .like-color { color: #3b82f6; }
      .love-color { color: #ef4444; }
      .rire-color { color: #f59e0b; }
      .colere-color { color: #dc2626; }
      .reactions-modal-list { padding: 8px 24px; overflow-y: auto; }
      .reaction-user-item {
        display: flex; align-items: center; gap: 12px; padding: 12px 0;
        border-bottom: 1px solid var(--border-color);
      }
      .reaction-user-item:last-child { border-bottom: none; }
      .reaction-user-item .user-name { flex: 1; font-weight: 500; }
      .reaction-user-item .user-reaction { font-size: 20px; }
    `;
    document.head.appendChild(style);
  },

  async show(videoId) {
    this.init();
    
    // Créer la structure de la modale
    const backdrop = document.createElement('div');
    backdrop.className = 'reactions-modal-backdrop';
    backdrop.innerHTML = `
      <div class="reactions-modal-content">
        <div class="reactions-modal-header">
          <h3>Réactions</h3>
          <button class="reactions-modal-close">&times;</button>
        </div>
        <div class="reactions-modal-body">
          <div class="loader" style="padding: 50px;"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    
    // Afficher la modale avec une transition
    setTimeout(() => backdrop.classList.add('show'), 10);
    
    // Gérer la fermeture
    backdrop.querySelector('.reactions-modal-close').addEventListener('click', () => this.hide());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.hide();
    });

    // Charger les données
    try {
      const { data, error } = await window.supabaseClient.supabase
        .from('video_reactions')
        .select(`reaction_type, users_profile(prenom, nom)`)
        .eq('video_id', videoId);
      
      if (error) throw error;
      this.renderData(data);

    } catch (err) {
      console.error("Erreur de chargement des réactions:", err);
      backdrop.querySelector('.reactions-modal-body').innerHTML = `<p style="text-align:center; padding: 40px;">Erreur de chargement des données.</p>`;
    }
  },

  renderData(reactions) {
    const body = document.querySelector('.reactions-modal-body');
    if (!body) return;

    if (reactions.length === 0) {
      body.innerHTML = `<p style="text-align:center; padding: 40px; color: var(--text-tertiary);">Aucune réaction pour cette vidéo.</p>`;
      return;
    }
    
    // 1. Faire le bilan
    const counts = { like: 0, love: 0, rire: 0, colere: 0 };
    reactions.forEach(r => {
      if (counts[r.reaction_type] !== undefined) {
        counts[r.reaction_type]++;
      }
    });

    // 2. Créer le HTML
    const summaryHTML = `
      <div class="reactions-modal-summary">
        <div class="summary-item">
          <i class="fas fa-thumbs-up like-color"></i>
          <div class="count like-color">${counts.like}</div>
        </div>
        <div class="summary-item">
          <i class="fas fa-heart love-color"></i>
          <div class="count love-color">${counts.love}</div>
        </div>
        <div class="summary-item">
          <i class="fas fa-laugh rire-color"></i>
          <div class="count rire-color">${counts.rire}</div>
        </div>
        <div class="summary-item">
          <i class="fas fa-angry colere-color"></i>
          <div class="count colere-color">${counts.colere}</div>
        </div>
      </div>
    `;

    const reactionIcons = {
        like: '<i class="fas fa-thumbs-up like-color"></i>',
        love: '<i class="fas fa-heart love-color"></i>',
        rire: '<i class="fas fa-laugh rire-color"></i>',
        colere: '<i class="fas fa-angry colere-color"></i>'
    };
    
    const listHTML = reactions.map(r => {
      const profile = r.users_profile || { prenom: 'Utilisateur', nom: 'Inconnu' };
      const name = `${profile.prenom} ${profile.nom}`;
      return `
        <div class="reaction-user-item">
          <span class="user-name">${name}</span>
          <span class="user-reaction">${reactionIcons[r.reaction_type] || ''}</span>
        </div>
      `;
    }).join('');

    body.innerHTML = summaryHTML + `<div class="reactions-modal-list">${listHTML}</div>`;
  },
  
  hide() {
    const backdrop = document.querySelector('.reactions-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('show');
      backdrop.addEventListener('transitionend', () => backdrop.remove(), { once: true });
    }
  }
};

console.log('%c✅ Module de réactions vidéo v1.0 chargé', 'color: #22c55e; font-weight: bold;');
