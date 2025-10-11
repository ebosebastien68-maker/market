// supabaseClient.js - Fichier central pour la connexion à Supabase

const SUPABASE_URL = 'https://fhovlfxoukmvqihoapej.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob3ZsZnhvdWttdnFpaG9hcGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTc1NTQsImV4cCI6MjA3NTczMzU1NH0.3vdAhHVfJYhD6ooLa9xdxV2crJIMMSrkn401QepaXRg';

// Vérifier si supabaseClient existe déjà pour éviter de le recréer
if (!window.supabaseClient) {
    // Créer le client Supabase à partir de l'objet global `supabase` fourni par le CDN
    const supabaseInstance = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /**
     * Récupère l'objet utilisateur actuellement connecté.
     * @returns {Promise<object|null>} L'objet utilisateur ou null s'il n'est pas connecté.
     */
    async function getCurrentUser() {
        const { data: { user }, error } = await supabaseInstance.auth.getUser();
        if (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error.message);
            return null;
        }
        return user;
    }

    /**
     * Récupère le profil complet de l'utilisateur depuis la table 'users_profile'.
     * @param {string} userId - L'ID de l'utilisateur.
     * @returns {Promise<object|null>} L'objet profil ou null en cas d'erreur.
     */
    async function getUserProfile(userId) {
        if (!userId) return null;
        
        const { data, error } = await supabaseInstance
            .from('users_profile')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('Erreur lors de la récupération du profil:', error.message);
            return null;
        }
        return data;
    }

    /**
     * Vérifie si un utilisateur est actuellement authentifié.
     * @returns {Promise<boolean>} Vrai si l'utilisateur est connecté, sinon faux.
     */
    async function checkAuth() {
        const user = await getCurrentUser();
        return user !== null;
    }

    /**
     * Déconnecte l'utilisateur actuel.
     * @returns {Promise<boolean>} Vrai si la déconnexion a réussi, sinon faux.
     */
    async function signOut() {
        const { error } = await supabaseInstance.auth.signOut();
        if (error) {
            console.error('Erreur lors de la déconnexion:', error.message);
            return false;
        }
        return true;
    }

    /**
     * Redirige l'utilisateur vers la page appropriée en fonction de son rôle.
     */
    async function redirectByRole() {
        const user = await getCurrentUser();
        
        if (!user) {
            window.location.href = 'connexion.html';
            return;
        }

        const profile = await getUserProfile(user.id);
        
        if (!profile) {
            alert('Erreur: Profil utilisateur introuvable. Déconnexion.');
            await signOut();
            window.location.href = 'connexion.html';
            return;
        }

        // MISE À JOUR : Redirection prenant en compte les 3 rôles ('user', 'admin', 'adminpro')
        if (profile.role === 'admin' || profile.role === 'adminpro') {
            window.location.href = 'publier.html';
        } else { // Si ce n'est pas un admin ou adminpro, c'est un 'user'
            window.location.href = 'index.html';
        }
    }

    // Exposer les fonctions et le client sur l'objet window pour un accès global
    window.supabaseClient = {
        supabase: supabaseInstance,
        getCurrentUser,
        getUserProfile,
        checkAuth,
        signOut,
        redirectByRole
    };
}
