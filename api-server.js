import express from 'express';
import cors from 'cors';
import { AuthManager, authMiddleware, requireRole } from './auth/auth_middleware.js';
import MultiSiteRunner from './multi-site-runner.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const multiSiteRunner = new MultiSiteRunner();

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await AuthManager.authenticateUser(username, password);
        
        if (result) {
            res.json(result);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/auth/register', requireRole('admin'), async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const userId = await AuthManager.createUser(username, email, password, role);
        res.json({ userId, message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected routes
app.get('/api/sites', authMiddleware, async (req, res) => {
    try {
        const siteAccess = await AuthManager.getUserSiteAccess(req.user.userId);
        const allSites = multiSiteRunner.listAvailableSites();
        
        // Filter sites based on user access
        const accessibleSites = req.user.role === 'admin' 
            ? allSites 
            : allSites.filter(site => siteAccess.some(access => access.name === site));
        
        res.json(accessibleSites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/test/:site', authMiddleware, async (req, res) => {
    try {
        const { site } = req.params;
        
        // Check if user has access to this site
        if (req.user.role !== 'admin') {
            const siteAccess = await AuthManager.getUserSiteAccess(req.user.userId);
            const hasAccess = siteAccess.some(access => access.name === site && access.access_level !== 'read');
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'No access to this site' });
            }
        }
        
        const result = await multiSiteRunner.runSiteTests(site);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dashboard/:site', authMiddleware, async (req, res) => {
    try {
        const { site } = req.params;
        
        // Check site access
        if (req.user.role !== 'admin') {
            const siteAccess = await AuthManager.getUserSiteAccess(req.user.userId);
            const hasAccess = siteAccess.some(access => access.name === site);
            
            if (!hasAccess) {
                return res.status(403).json({ error: 'No access to this site' });
            }
        }
        
        // Return dashboard data for the site
        res.json({ message: `Dashboard data for ${site}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`API Lens server running on port ${port}`);
});