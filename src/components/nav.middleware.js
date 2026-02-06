module.exports = (req, res, next) => {

    
    // ==================== INFORMACIÓN DEL USUARIO ====================
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = !!req.user;
    res.locals.userId = req.user?.id_registro_usuarios || null;
    res.locals.userName = req.user?.nombre_completo || null;
    res.locals.userEmail = req.user?.nombre_usuario || null;

    // ==================== INFORMACIÓN DE NAVEGACIÓN ====================
    res.locals.currentPath = req.path;
    res.locals.currentRoute = req.baseUrl;
    
    // Determinar sección activa
    const pathSegments = req.path.split('/').filter(Boolean);
    res.locals.activeSection = pathSegments[1] || 'home';
    
    // ==================== MENÚ ITEMS ====================
    res.locals.menuItems = [
        {
            name: 'Inicio',
            path: '/api/index',
            icon: 'home',
            active: req.path === '/api/index'
        },
        {
            name: 'Firmar Documentos',
            path: '/api/masivesign/',
            icon: 'file-signature',
            active: req.path.includes('/masivesign')
        },
        {
            name: 'Mis Solicitudes',
            path: '/api/pending',
            icon: 'clipboard-list',
            active: req.path.includes('/pending')
        },
        {
            name: 'Crear Formato',
            path: '/api/createFormat/',
            icon: 'file-contract',
            active: req.path.includes('/createFormat')
        },
        {
            name: 'Mi Perfil',
            path: '/api/userProfile/',
            icon: 'user-circle',
            active: req.path.includes('/userProfile')
        }
    ];

    res.locals.menuItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ${item.path} (Activo: ${item.active})`);
    });

    // ==================== VARIABLES DE APLICACIÓN ====================
    res.locals.appName = 'DocSigned';
    res.locals.appVersion = '1.0.0';
    res.locals.currentYear = new Date().getFullYear();
    
    // ==================== ESTADO DE NOTIFICACIONES ====================
    res.locals.notifications = {
        count: 0,
        items: [],
        unread: 0
    };

    // ==================== BREADCRUMBS ====================
    res.locals.breadcrumbs = generateBreadcrumbs(req.path);
    

    res.locals.breadcrumbs.forEach((crumb, index) => {
        console.log(`   ${index + 1}. ${crumb.name} - ${crumb.path} (Activo: ${crumb.active})`);
    });

    // ==================== INFORMACIÓN DE SESIÓN ====================
    res.locals.sessionId = req.sessionID || null;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;

    // ==================== VARIABLES DE ESTADO ====================
    res.locals.isLoading = false;
    res.locals.hasError = false;
    res.locals.successMessage = null;
    res.locals.errorMessage = null;

    // ==================== VARIABLES DE TEMA ====================
    res.locals.theme = req.user?.preferencias_tema || 'light';
    res.locals.language = req.user?.idioma || 'es';

    next();
};

/**
 * Función para generar breadcrumbs automáticamente
 * @param {string} path - Ruta actual
 * @returns {Array} Array de objetos breadcrumb
 */
function generateBreadcrumbs(path) {
    const breadcrumbs = [
        {
            name: 'Inicio',
            path: '/api/index',
            active: false
        }
    ];

    const segments = path.split('/').filter(Boolean);
    let currentPath = '';

    const routeNames = {
        'masivesign': 'Firmar Documentos',
        'pending': 'Mis Solicitudes',
        'createFormat': 'Crear Formato',
        'userProfile': 'Mi Perfil',
        'application': 'Aplicaciones',
        'users': 'Usuarios'
    };

    segments.forEach((segment, index) => {
        if (segment === 'api') return;
        
        currentPath += `/${segment}`;
        const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        
        breadcrumbs.push({
            name: name,
            path: currentPath,
            active: index === segments.length - 2
        });
    });

    return breadcrumbs;
}