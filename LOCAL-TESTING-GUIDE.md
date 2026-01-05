🏠 THE GRASSROOTS HUB - LOCAL TESTING GUIDE
===============================================

## 🖥️ **LOCAL DEVELOPMENT ACCESS**

### **For Your Local Testing:**

| **Access Method** | **URL** | **Description** |
|-------------------|---------|-----------------|
| **🏠 Localhost** | **http://localhost:5173** | Standard local development |
| **📱 Local Network** | **http://192.168.0.44:5173** | Same WiFi network access |
| **🌍 External (Global)** | **https://grassroots-hub-2025.loca.lt** | Worldwide access |

### **Backend API Access:**

| **Environment** | **URL** | **Usage** |
|-----------------|---------|-----------|
| **🏠 Local Backend** | **http://localhost:5000** | Local development API |
| **📱 Network Backend** | **http://192.168.0.44:5000** | Network API access |
| **🌍 External Backend** | **https://grassroots-api-2025.loca.lt** | Global API access |

---

## 🚀 **QUICK START FOR LOCAL TESTING**

### **1. Start Both Servers**

```bash
# Terminal 1 - Backend (already running)
cd backend
node server.js
# ✅ Server running on all interfaces at port 5000

# Terminal 2 - Frontend 
cd ..
npm run dev
# ✅ Frontend running on port 5173
```

### **2. Access Your Application**

**Main Local URL:** http://localhost:5173

**Alternative Local URLs:**
- http://127.0.0.1:5173
- http://192.168.0.44:5173 (network access)

---

## 🧪 **TEST ACCOUNTS FOR LOCAL TESTING**

### **Admin Account**
- **Email:** admin@grassrootshub.com
- **Password:** admin123
- **Features:** Full admin dashboard, analytics, user management

### **Coach Account**
- **Email:** coach.wilson@email.com
- **Password:** password123
- **Features:** Post team vacancies, create trials, manage team profiles

### **Player Account**
- **Email:** player.martinez@email.com
- **Password:** password123
- **Features:** Post availability, respond to trials, manage player profile

### **Parent Account**
- **Email:** parent.taylor@email.com
- **Password:** password123
- **Features:** Manage child profiles, view opportunities

---

## 🔧 **LOCAL DEVELOPMENT FEATURES**

### **Hot Reload & Development**
- ✅ React hot reload enabled
- ✅ Backend API live updates
- ✅ Database changes reflected immediately
- ✅ Browser dev tools available

### **Local Database**
- 📁 Location: `backend/database.sqlite`
- 🔍 35 real FA leagues imported
- 👥 Test users and data available
- 📊 Analytics data populated

### **Network Configuration**
Your server is configured for maximum flexibility:

```javascript
// Your current server.js configuration
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on all interfaces at port ${PORT}`);
  console.log(`📱 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://192.168.0.44:${PORT}`);
});
```

---

## 🎯 **LOCAL TESTING SCENARIOS**

### **1. Authentication Testing**
- ✅ Login with test accounts
- ✅ Register new local accounts
- ✅ Test password validation
- ✅ Role-based access control

### **2. Database Operations**
- ✅ Create team vacancies
- ✅ Post player availability
- ✅ Search and filter functionality
- ✅ Profile management

### **3. Real League Data**
- ✅ Browse authentic FA leagues
- ✅ Test league filtering
- ✅ Click official FA website links
- ✅ Regional league organization

### **4. Admin Dashboard**
- ✅ Analytics overview
- ✅ User management
- ✅ League administration
- ✅ System monitoring

### **5. API Testing**
- ✅ Backend health: http://localhost:5000/api/health
- ✅ Leagues endpoint: http://localhost:5000/api/leagues
- ✅ Authentication endpoints
- ✅ CRUD operations

---

## 🛠️ **DEVELOPMENT TOOLS**

### **Browser Dev Tools**
- 🔍 Network tab for API calls
- 📱 Responsive design testing
- 🐛 Console for debugging
- 📊 Performance monitoring

### **VS Code Integration**
- 🔧 Integrated terminal for servers
- 🎯 Debugging capabilities
- 🔍 Code navigation
- 📝 Git integration

### **Database Inspection**
```bash
# View database directly
sqlite3 backend/database.sqlite
.tables
SELECT * FROM users LIMIT 5;
SELECT * FROM leagues LIMIT 10;
```

---

## 📱 **MOBILE TESTING (Local Network)**

Test on your mobile devices using:
- **WiFi URL:** http://192.168.0.44:5173
- **Requirements:** Same WiFi network
- **Platforms:** iOS Safari, Android Chrome

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues & Solutions**

**❌ Frontend not loading:**
```bash
cd /path/to/grassroots-hub
npm run dev
```

**❌ Backend API errors:**
```bash
cd backend
node server.js
# Check: http://localhost:5000/api/health
```

**❌ Database issues:**
```bash
# Check database file exists
ls -la backend/database.sqlite
# Recreate if needed
cd backend
node scripts/create-test-data.js
```

**❌ Port conflicts:**
- Frontend: Default 5173, change in vite.config.ts
- Backend: Default 5000, change PORT in .env

---

## ✅ **CURRENT STATUS**

**Backend Server:** ✅ Running on all interfaces (0.0.0.0:5000)
**Frontend Dev Server:** ⚠️ Needs to be started
**Database:** ✅ Ready with test data and real leagues
**External Tunnels:** ✅ Active for worldwide testing

---

## 🔄 **NEXT STEPS FOR LOCAL TESTING**

1. **Start Frontend Server:**
```bash
cd /path/to/grassroots-hub
npm run dev
```

2. **Open Browser:**
- Navigate to: http://localhost:5173
- Login with any test account above

3. **Test Key Features:**
- User registration and authentication
- Team vacancy posting (Coach account)
- Player availability posting (Player account)
- Admin dashboard (Admin account)
- Real league browsing

4. **Monitor Development:**
- Check browser console for errors
- Watch terminal for server logs
- Test API responses in Network tab

Your local development environment is ready! 🎉
